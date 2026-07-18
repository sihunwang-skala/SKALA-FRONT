// 브라우저에서 실행되는 ANC 안내 챗봇
// 모델 연산은 Web Worker에서 처리하고, 상품 정보는 headphones.json을 사용한다.

import {
    CreateWebWorkerMLCEngine,
    prebuiltAppConfig
} from "https://esm.run/@mlc-ai/web-llm";

// 채팅 화면 요소

const agentButton = document.getElementById("agent-button");
const agentPanel = document.getElementById("agent-panel");
const agentClose = document.getElementById("agent-close");
const agentMinimize = document.getElementById("agent-minimize");
const statusText = document.getElementById("agent-status");

const introView = document.getElementById("agent-intro");
const startBtn = document.getElementById("agent-start");
const supportText = document.getElementById("agent-support-message");

const loadingView = document.getElementById("agent-loading");
const progressBar = document.getElementById("agent-progress");
const progressFill = document.getElementById("agent-progress-fill");
const progressText = document.getElementById("agent-progress-number");
const loadingNote = document.getElementById("agent-loading-note");

const chatView = document.getElementById("agent-chat");
const messageList = document.getElementById("agent-messages");
const suggestionBtns = document.querySelectorAll(".agent-suggestion-button");
const chatForm = document.getElementById("agent-input-form");
const questionInput = document.getElementById("agent-input");
const sendBtn = document.getElementById("agent-send");
const clearBtn = document.getElementById("agent-clear");

// 현재 상태

let shopData = null;
let facts = null;
let promptText = "";
let productsById = new Map();
let termsById = new Map();

let engine = null;
let isStarting = false;
let history = [];

const allowedActionTypes = new Set([
    "scrollToProduct",
    "scrollToTerm",
    "highlightProducts",
    "prepareOfficialLink",
    "openSources",
    "scrollToTechNote"
]);

// 상품과 용어 데이터

async function loadShopData() {
    try {
        const response = await fetch(new URL("../data/headphones.json", import.meta.url));

        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        return await response.json();
    } catch (error) {
        console.error("[ANC AI] data/headphones.json 로드 실패", error);
        return null;
    }
}

function getFacts(products) {
    const pricedProducts = products.filter(function (product) {
        return Number.isFinite(product.priceKRW);
    });

    const byWeightAsc = [...products].sort(function (a, b) {
        return a.weightGram - b.weightGram;
    });

    const byBatteryDesc = [...products].sort(function (a, b) {
        return b.batteryANC - a.batteryANC;
    });

    const byPriceAsc = [...pricedProducts].sort(function (a, b) {
        return a.priceKRW - b.priceKRW;
    });

    return {
        lightest: byWeightAsc[0] || null,
        heaviest: byWeightAsc[byWeightAsc.length - 1] || null,
        longestBattery: byBatteryDesc[0] || null,
        shortestBattery: byBatteryDesc[byBatteryDesc.length - 1] || null,
        lowestPrice: byPriceAsc[0] || null,
        highestPrice: byPriceAsc[byPriceAsc.length - 1] || null
    };
}

// AI에게 전달할 자료

// 같은 필드명이 반복되지 않도록 표 형식의 짧은 문맥을 만든다.
function formatProducts(products) {
    const header = "id | brand | name | priceKRW | priceText | release | weightGram | batteryANC | bluetooth | terms | description";

    const rows = products.map(function (product) {
        return [
            product.id,
            product.brand,
            product.name,
            product.priceKRW === null || product.priceKRW === undefined ? "unknown" : product.priceKRW,
            product.priceText,
            product.release,
            product.weightGram,
            product.batteryANC,
            product.bluetooth,
            (product.terms || []).join(","),
            product.description
        ].join(" | ");
    });

    return [header].concat(rows).join("\n");
}

function formatTerms(glossary) {
    const header = "id | term | aliases | description";

    const rows = glossary.map(function (term) {
        return [term.id, term.term, (term.aliases || []).join(","), term.description].join(" | ");
    });

    return [header].concat(rows).join("\n");
}

function formatFacts(facts) {
    const slimmed = slimFacts(facts);

    return Object.keys(slimmed)
        .map(function (key) {
            const entry = slimmed[key];

            if (!entry) {
                return key + ": 없음";
            }

            const metricField = DERIVED_FACT_METRIC_FIELD[key];
            const metricPart = metricField ? ", " + metricField + "=" + entry[metricField] : "";

            return key + ": " + entry.id + " (" + entry.name + metricPart + ")";
        })
        .join("\n");
}

// 비교 결과에는 필요한 값만 남겨 문맥 길이를 줄인다.
const DERIVED_FACT_METRIC_FIELD = {
    lightest: "weightGram",
    heaviest: "weightGram",
    longestBattery: "batteryANC",
    shortestBattery: "batteryANC",
    lowestPrice: "priceKRW",
    highestPrice: "priceKRW"
};

function slimFacts(facts) {
    const slimmed = {};

    Object.keys(facts).forEach(function (key) {
        const product = facts[key];

        if (!product) {
            slimmed[key] = null;
            return;
        }

        const entry = {
            id: product.id,
            name: product.brand + " " + product.name
        };

        const metricField = DERIVED_FACT_METRIC_FIELD[key];

        if (metricField) {
            entry[metricField] = product[metricField];
        }

        slimmed[key] = entry;
    });

    return slimmed;
}

function makePrompt(data, facts) {
    const rules = [
        "1. 한국어로 답한다.",
        "2. 답변은 기본적으로 2문장부터 5문장으로 작성한다.",
        "3. 데이터에 없는 사실은 추측하지 않는다.",
        "4. 확인할 수 없는 내용은 \"현재 페이지 자료만으로는 확인할 수 없습니다\"라고 말한다.",
        "5. 제품 추천 시 사용자의 기준과 해당 사양을 함께 설명한다.",
        "6. 가격과 출시 정보는 현재 페이지에 적힌 기준일 자료임을 필요할 때 안내한다.",
        "7. 제품 성능 순위를 임의로 만들지 않는다.",
        "8. \"소리가 완전히 사라진다\"는 표현을 사용하지 않는다.",
        "9. 상품 공식 사이트를 자동으로 열지 않는다.",
        "10. 이동 가능한 상품이나 용어가 있으면 안전한 action을 함께 반환한다."
    ].join("\n");

    return [
        "너는 ANC HEADPHONE SHOP의 로컬 AI 도우미다.",
        "",
        "반드시 제공된 SHOP_DATA와 GLOSSARY_DATA만 근거로 답한다.",
        "",
        "규칙:",
        rules,
        "",
        "다른 글자를 앞뒤에 붙이지 말고 반드시 다음 JSON 형식 하나로만 답한다.",
        "{\"answer\": \"두 문장에서 다섯 문장 사이의 한국어 답변\", \"actions\": [{\"type\": \"허용된 action\", \"target\": \"상품 id 또는 용어 id\", \"label\": \"버튼에 표시할 짧은 문구\"}]}",
        "",
        "허용된 action type: scrollToProduct, scrollToTerm, highlightProducts, prepareOfficialLink, openSources, scrollToTechNote",
        "이동할 상품이나 용어가 없으면 actions는 빈 배열로 둔다.",
        "",
        "PAGE_GUIDE:",
        data.pageGuide,
        "",
        "PRICE_BASE_DATE: " + data.priceBaseDate,
        "",
        "SHOP_DATA (| 로 구분된 표, 첫 줄은 컬럼 이름):",
        formatProducts(data.products),
        "",
        "GLOSSARY_DATA (| 로 구분된 표, 첫 줄은 컬럼 이름):",
        formatTerms(data.glossary),
        "",
        "ANC_NOTE:",
        JSON.stringify(data.ancNote),
        "",
        "DERIVED_FACTS (숫자 비교용으로 미리 계산된 값이며 그대로 신뢰해도 된다):",
        formatFacts(facts)
    ].join("\n");
}

// 사용할 모델 선택

function pickModel(modelList) {
    const modelIds = modelList.map(function (model) {
        return model.model_id;
    });

    const preferredPatterns = [
        /Qwen2\.5.*1\.5B.*Instruct.*q4f16/i,
        /Qwen2.*1\.5B.*Instruct.*q4f16/i,
        /Llama-3\.2.*1B.*Instruct.*q4f16/i,
        /Phi-3.*mini.*instruct.*q4f16/i
    ];

    for (const pattern of preferredPatterns) {
        const matchedModel = modelIds.find(function (modelId) {
            return pattern.test(modelId);
        });

        if (matchedModel) {
            return matchedModel;
        }
    }

    return null;
}

// WebGPU 확인과 오류 처리

function hasWebGpu() {
    return typeof navigator !== "undefined" && !!navigator.gpu;
}

function getErrorText(error) {
    if (!error) {
        return "";
    }

    if (typeof error === "string") {
        return error;
    }

    if (error.message) {
        return error.message;
    }

    try {
        return String(error);
    } catch (stringifyError) {
        return "";
    }
}

function getErrorMessage(kind, error) {
    const rawDetail = getErrorText(error);
    const detail = rawDetail ? " (" + rawDetail + ")" : "";

    const messages = {
        webgpu:
            "현재 브라우저 또는 기기에서는 로컬 AI 실행에 필요한 WebGPU를 사용할 수 없습니다. " +
            "최신 Chrome 브라우저에서 다시 시도해 주세요.",
        model: "현재 환경에서 사용할 수 있는 경량 AI 모델을 찾지 못했습니다.",
        prepare:
            "AI 모델을 준비하는 중 문제가 발생했습니다. 모델을 내려받거나 초기화하는 " +
            "단계에서 오류가 났을 수 있습니다. 네트워크 상태를 확인하고 다시 시도해 주세요." + detail,
        response: "답변을 생성하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요." + detail,
        data: "상품 정보를 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요." + detail
    };

    return messages[kind] || ("알 수 없는 문제가 발생했습니다." + detail);
}

function updateProgress(report) {
    const percent = Math.round((report && report.progress ? report.progress : 0) * 100);

    if (progressFill) {
        progressFill.style.width = percent + "%";
    }

    if (progressText) {
        progressText.textContent = percent + "%";
    }

    if (progressBar) {
        progressBar.setAttribute("aria-valuenow", String(percent));
    }

    if (loadingNote && report && report.text) {
        loadingNote.textContent = report.text;
    }
}

// 페이지 이동 기능

function scrollTo(element, block) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    element.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: block || "start"
    });
}

function highlight(element, duration) {
    if (!element) {
        return;
    }

    const ms = typeof duration === "number" ? duration : 1200;

    element.classList.remove("agent-highlight");
    void element.offsetWidth;
    element.classList.add("agent-highlight");

    window.setTimeout(function () {
        element.classList.remove("agent-highlight");
    }, ms);
}

function scrollToProduct(productId) {
    const product = productsById.get(productId);

    if (!product) {
        return;
    }

    const card = document.querySelector(product.cardSelector);

    if (!card) {
        return;
    }

    scrollTo(card, "center");
    highlight(card, 1200);
}

function scrollToTerm(termId) {
    const term = termsById.get(termId);

    if (!term) {
        return;
    }

    const item = document.querySelector(term.selector);

    if (!item) {
        return;
    }

    scrollTo(item, "start");

    // 기존 용어 카드 강조(.term-highlight, script.js)를 그대로 재사용합니다.
    item.classList.remove("term-highlight");
    void item.offsetWidth;
    item.classList.add("term-highlight");

    window.setTimeout(function () {
        item.classList.remove("term-highlight");
    }, 1200);
}

function highlightProducts(productIds) {
    let firstCard = null;

    productIds.forEach(function (productId) {
        const product = productsById.get(productId);

        if (!product) {
            return;
        }

        const card = document.querySelector(product.cardSelector);

        if (!card) {
            return;
        }

        highlight(card, 1500);

        if (!firstCard) {
            firstCard = card;
        }
    });

    if (firstCard) {
        scrollTo(firstCard, "center");
    }
}

function prepareOfficialLink(productId, actionsContainer) {
    const product = productsById.get(productId);

    if (!product || !actionsContainer) {
        return;
    }

    // 새 창을 바로 열지 않고, 사용자가 직접 눌러야만 공식 사이트로 이동하는 버튼만 만듭니다.
    const link = document.createElement("a");
    link.href = product.officialUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "agent-message-action-button";
    link.textContent = "공식 제품 페이지 열기 ↗";

    actionsContainer.appendChild(link);
}

function openSources() {
    const sourcesSection = document.getElementById("sources");

    if (!sourcesSection) {
        return;
    }

    const details = sourcesSection.querySelector("details");

    if (details) {
        details.open = true;
    }

    const target = sourcesSection.querySelector(".section-inner") || sourcesSection;
    scrollTo(target, "start");
    highlight(target, 1200);
}

function scrollToTechNote() {
    const section = document.getElementById("tech-note");

    if (!section) {
        return;
    }

    const target = section.querySelector(".section-inner") || section;
    scrollTo(target, "start");
    highlight(target, 1200);
}

function describeAction(action) {
    switch (action.type) {
        case "scrollToProduct":
            return "관련 상품 보기";
        case "scrollToTerm":
            return "관련 용어 보기";
        case "highlightProducts":
            return "관련 상품 보기";
        case "openSources":
            return "출처 보기";
        case "scrollToTechNote":
            return "ANC 원리 보기";
        default:
            return "이동하기";
    }
}

function runAgentAction(action, actionsContainer) {
    if (!action || !allowedActionTypes.has(action.type)) {
        return;
    }

    if (action.type === "scrollToProduct" && productsById.has(action.target)) {
        scrollToProduct(action.target);
        return;
    }

    if (action.type === "scrollToTerm" && termsById.has(action.target)) {
        scrollToTerm(action.target);
        return;
    }

    if (action.type === "highlightProducts") {
        const ids = Array.isArray(action.target) ? action.target : [action.target];
        const validIds = ids.filter(function (id) {
            return productsById.has(id);
        });

        if (validIds.length > 0) {
            highlightProducts(validIds);
        }

        return;
    }

    if (action.type === "prepareOfficialLink" && productsById.has(action.target)) {
        prepareOfficialLink(action.target, actionsContainer);
        return;
    }

    if (action.type === "openSources") {
        openSources();
        return;
    }

    if (action.type === "scrollToTechNote") {
        scrollToTechNote();
    }
}

// 채팅 화면

function setHidden(element, hidden) {
    if (element) {
        element.hidden = hidden;
    }
}

function showIntroPanel() {
    setHidden(introView, false);
    setHidden(loadingView, true);
    setHidden(chatView, true);
}

function showLoadingPanel() {
    setHidden(introView, true);
    setHidden(loadingView, false);
    setHidden(chatView, true);

    if (statusText) {
        statusText.textContent = "AI 모델을 준비하고 있습니다";
    }
}

function showChatPanel() {
    setHidden(introView, true);
    setHidden(loadingView, true);
    setHidden(chatView, false);
}

function showSupportMessage(message) {
    if (!supportText) {
        return;
    }

    supportText.textContent = message;
    supportText.hidden = false;
}

function setInputEnabled(enabled) {
    if (questionInput) {
        questionInput.disabled = !enabled;
    }

    if (sendBtn) {
        sendBtn.disabled = !enabled;
    }
}

function addUserMessage(text) {
    if (!messageList) {
        return;
    }

    const bubble = document.createElement("p");
    bubble.className = "agent-message agent-message-user";
    bubble.textContent = text;

    messageList.appendChild(bubble);
    messageList.scrollTop = messageList.scrollHeight;
}

function addAgentMessage(answerText, actions) {
    if (!messageList) {
        return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "agent-message agent-message-ai";

    const text = document.createElement("p");
    text.textContent = answerText;
    wrapper.appendChild(text);

    if (Array.isArray(actions) && actions.length > 0) {
        const actionsContainer = document.createElement("div");
        actionsContainer.className = "agent-message-actions";
        wrapper.appendChild(actionsContainer);

        actions.forEach(function (action) {
            if (!action || !allowedActionTypes.has(action.type)) {
                return;
            }

            if (action.type === "prepareOfficialLink") {
                runAgentAction(action, actionsContainer);
                return;
            }

            const button = document.createElement("button");
            button.type = "button";
            button.className = "agent-message-action-button";
            button.textContent = action.label || describeAction(action);

            button.addEventListener("click", function () {
                runAgentAction(action, actionsContainer);
            });

            actionsContainer.appendChild(button);
        });
    }

    messageList.appendChild(wrapper);
    messageList.scrollTop = messageList.scrollHeight;
}

function addThinkingMessage() {
    removeThinkingMessage();

    if (!messageList) {
        return;
    }

    const el = document.createElement("p");
    el.id = "agent-loading-message";
    el.className = "agent-message-loading";
    el.textContent = "ANC AI가 홈페이지 자료를 확인하고 있습니다...";

    messageList.appendChild(el);
    messageList.scrollTop = messageList.scrollHeight;
}

function removeThinkingMessage() {
    const el = document.getElementById("agent-loading-message");

    if (el && el.parentElement) {
        el.parentElement.removeChild(el);
    }
}

function normalizeReply(parsed, fallbackText) {
    if (parsed && typeof parsed.answer === "string") {
        return {
            answer: parsed.answer,
            actions: Array.isArray(parsed.actions) ? parsed.actions : []
        };
    }

    return {
        answer: fallbackText,
        actions: []
    };
}

// 파싱에 실패해도 채팅이 멈추지 않고 일반 텍스트로 표시합니다.
function parseReply(rawText) {
    const trimmed = (rawText || "").trim();

    try {
        return normalizeReply(JSON.parse(trimmed), trimmed);
    } catch (error) {
        const match = trimmed.match(/\{[\s\S]*\}/);

        if (match) {
            try {
                return normalizeReply(JSON.parse(match[0]), trimmed);
            } catch (innerError) {
                // 그대로 아래에서 일반 텍스트로 처리합니다.
            }
        }
    }

    return {
        answer: trimmed || "AI가 응답을 생성하지 못했습니다.",
        actions: []
    };
}

// 이 프로젝트가 고르는 경량 모델(1~1.5B)은 context_window_size가 4096처럼 작은 경우가 많아,
// system prompt(상품/용어 데이터) 하나만으로도 여유가 많지 않습니다. 그래서 최근 문답을
// 넉넉히 다 보내지 않고 아주 짧게만 유지합니다.
const HISTORY_MESSAGE_LIMIT = 4; // 최근 두 번의 문답만 유지

function isContextWindowError(error) {
    const detail = getErrorText(error);
    return (
        (error && error.name === "ContextWindowSizeExceededError") ||
        /context window/i.test(detail)
    );
}

function makeMessages(historyLimit) {
    const limit = typeof historyLimit === "number" ? historyLimit : HISTORY_MESSAGE_LIMIT;
    const recentHistory = limit > 0 ? history.slice(-limit) : [];
    return [{ role: "system", content: promptText }].concat(recentHistory);
}

async function getCompletion(historyLimit) {
    const completion = await engine.chat.completions.create({
        messages: makeMessages(historyLimit),
        temperature: 0.4,
        stream: false
    });

    return completion && completion.choices && completion.choices[0] && completion.choices[0].message
        ? completion.choices[0].message.content
        : "";
}

async function askAgent(question) {
    if (!question || !engine) {
        return;
    }

    addUserMessage(question);
    history.push({ role: "user", content: question });

    setInputEnabled(false);
    addThinkingMessage();

    try {
        let rawText;

        try {
            rawText = await getCompletion();
        } catch (firstError) {
            // 이전 대화 기록을 빼고 이번 질문만으로 한 번 더 시도합니다.
            if (!isContextWindowError(firstError)) {
                throw firstError;
            }

            console.warn("[ANC AI] 컨텍스트 길이 초과, 이전 대화 없이 재시도합니다.", firstError);
            rawText = await getCompletion(0);
        }

        history.push({ role: "assistant", content: rawText });

        const parsed = parseReply(rawText);

        removeThinkingMessage();
        addAgentMessage(parsed.answer, parsed.actions);
    } catch (error) {
        console.error("[ANC AI] 응답 생성 실패", error);
        removeThinkingMessage();
        addAgentMessage(getErrorMessage("response", error), []);
    } finally {
        setInputEnabled(true);

        if (questionInput) {
            questionInput.focus();
        }
    }
}

function submitQuestion() {
    if (!questionInput || questionInput.disabled) {
        return;
    }

    const value = questionInput.value.trim();

    if (!value) {
        return;
    }

    questionInput.value = "";
    askAgent(value);
}

// 모델 시작

async function startModel() {
    if (isStarting || engine) {
        return;
    }

    if (!shopData) {
        showSupportMessage(getErrorMessage("data"));
        return;
    }

    if (!hasWebGpu()) {
        showSupportMessage(getErrorMessage("webgpu"));
        return;
    }

    let modelList = [];

    try {
        modelList = prebuiltAppConfig.model_list || [];
    } catch (error) {
        modelList = [];
    }

    const modelId = pickModel(modelList);

    if (!modelId) {
        showSupportMessage(getErrorMessage("model"));
        return;
    }

    isStarting = true;
    showLoadingPanel();

    try {
        const worker = new Worker(new URL("./ancAgentWorker.js", import.meta.url), { type: "module" });

        engine = await CreateWebWorkerMLCEngine(worker, modelId, {
            initProgressCallback: updateProgress
        });

        if (statusText) {
            statusText.textContent = "로컬 AI 준비 완료";
        }

        showChatPanel();
        setInputEnabled(true);

        if (questionInput) {
            questionInput.focus();
        }
    } catch (error) {
        console.error("[ANC AI] 모델 준비 실패", error);
        engine = null;
        showIntroPanel();
        showSupportMessage(getErrorMessage("prepare", error));

        if (statusText) {
            statusText.textContent = "모델을 아직 시작하지 않았습니다";
        }
    } finally {
        isStarting = false;
    }
}

// 버튼/패널 이벤트 연결 (요소가 있을 때만 연결합니다) dialog의 showModal()/show() 대신, hidden 속성만으로 여닫습니다. 가장 단순하고 브라우저 차이가 없는 방식이라 채팅 위젯처럼 화면 오른쪽에 그대로 붙어서 뜨고, 열려 있어도 어두운 배경 없이 뒤쪽 화면을 계속 쓸 수 있습니다.

function openPanel() {
    if (!agentPanel) {
        return;
    }

    agentPanel.hidden = false;

    if (questionInput && !questionInput.disabled) {
        questionInput.focus();
    }
}

function closePanel() {
    if (!agentPanel) {
        return;
    }

    agentPanel.hidden = true;

    if (agentButton) {
        agentButton.focus();
    }
}

if (agentButton && agentPanel) {
    agentButton.addEventListener("click", function () {
        if (agentPanel.hidden) {
            openPanel();
        } else {
            closePanel();
        }
    });
}

if (agentClose && agentPanel) {
    agentClose.addEventListener("click", closePanel);
}

// 최소화는 패널을 닫되, engine과 대화 기록은 그대로 남겨 다시 열면 이어서 사용할 수 있습니다.
if (agentMinimize && agentPanel) {
    agentMinimize.addEventListener("click", closePanel);
}

// Esc로 패널을 닫을 수 있게 합니다.
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && agentPanel && !agentPanel.hidden) {
        closePanel();
    }
});

if (startBtn) {
    startBtn.addEventListener("click", startModel);
}

if (chatForm) {
    chatForm.addEventListener("submit", function (event) {
        event.preventDefault();
        submitQuestion();
    });
}

if (questionInput) {
    questionInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submitQuestion();
        }
    });
}

if (clearBtn) {
    clearBtn.addEventListener("click", function () {
        // 화면 메시지와 대화 배열만 초기화하며, 모델 캐시(내려받은 파일)는 지우지 않습니다.
        history = [];

        if (messageList) {
            messageList.innerHTML = "";
        }
    });
}

suggestionBtns.forEach(function (button) {
    button.addEventListener("click", function () {
        if (!questionInput || questionInput.disabled) {
            return;
        }

        askAgent(button.textContent.trim());
    });
});

// 초기 데이터 로드

(async function initAncAgent() {
    const data = await loadShopData();

    if (!data) {
        showSupportMessage(getErrorMessage("data"));
        return;
    }

    shopData = data;
    facts = getFacts(data.products);
    promptText = makePrompt(data, facts);

    productsById = new Map(
        data.products.map(function (product) {
            return [product.id, product];
        })
    );

    termsById = new Map(
        data.glossary.map(function (term) {
            return [term.id, term];
        })
    );
})();

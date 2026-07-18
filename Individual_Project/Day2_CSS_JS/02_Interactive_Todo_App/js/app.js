// ============================================================================
// 종합실습4 - app.js
// [종합실습4 추가 요구사항] 화면/이벤트 로직을 storage.js와 분리한 ES 모듈
// ============================================================================

import { loadTodos, saveTodos, loadGoal, saveGoal } from "./storage.js";

// ----------------------------------------------------------------------------
// 1. DOM 요소 가져오기
// ----------------------------------------------------------------------------
const currentDateEl = document.querySelector("#current-date");

const goalForm = document.querySelector("#goal-form");
const goalInput = document.querySelector("#goal-input");
const goalSavedMessage = document.querySelector("#goal-saved-message");

const todoForm = document.querySelector("#todo-form");
const todoInput = document.querySelector("#todo-input");
const todoTimeInput = document.querySelector("#todo-time-input");
const inputMessage = document.querySelector("#input-message");
const filterButtons = document.querySelector("#filter-buttons");
const todoList = document.querySelector("#todo-list");

const totalCount = document.querySelector("#total-count");
const completedCount = document.querySelector("#completed-count");
const remainingCount = document.querySelector("#remaining-count");
const progressBar = document.querySelector("#progress-bar");
const progressBarFill = document.querySelector("#progress-bar-fill");
const progressPercent = document.querySelector("#progress-percent");
const clearCompletedButton = document.querySelector("#clear-completed-button");

const quoteText = document.querySelector("#quote-text");
const quoteTranslation = document.querySelector("#quote-translation");
const quoteAuthor = document.querySelector("#quote-author");
const reloadQuoteButton = document.querySelector("#reload-quote-button");

// ----------------------------------------------------------------------------
// 2. 앱 상태
// ----------------------------------------------------------------------------
// [종합실습4 데이터 모델 확장] [사용자 직접 요청]
// 원래 PPT 기본 요구사항은 { id, text, done }이지만, 시간순 정렬 기능을 위해
// 사용자가 명시적으로 요청하여 time 필드(문자열 "HH:MM" 또는 빈 문자열)를
// 추가했습니다. id/text/done 세 필드의 의미와 타입은 그대로이며, time은
// 정렬·표시에만 쓰는 선택 필드입니다.
let todos = loadTodos();

// 현재 선택된 필터: all / active / completed
let currentFilter = "all";

// [사용자 직접 입력 - 선택]
// 인터넷 연결이 없거나 데이터 로드가 실패했을 때 표시할 기본 문구입니다.
const DEFAULT_QUOTE_EN = "A small step of finishing one task starts a big change.";
const DEFAULT_QUOTE_KO = "작은 할 일 하나의 완료가 큰 변화를 시작합니다.";

// [개발자 확인]
// 오늘의 한마디는 영어 원문 + 자연스러운 한국어 번역을 함께 제공해야 합니다.
// 외부 랜덤 명언 API(dummyjson)는 명언 종류가 매우 많아 모든 항목에 자연스러운
// 번역을 안정적으로 붙이기 어렵기 때문에, 번역까지 포함한 데이터를 프로젝트
// 안에 직접 두고 fetch()로 불러오는 방식을 사용합니다. 여전히 fetch,
// async/await, try/catch를 사용하는 비동기 데이터 로드이며, Live Server 등
// HTTP 서버 없이 file://로 열면 CORS 오류가 나는 것도 기존과 동일합니다.
const QUOTES_DATA_URL = "./data/quotes.json";

// 같은 명언이 연속으로 뽑히지 않도록 마지막으로 표시한 명언 id를 기억합니다.
let lastQuoteId = null;

// [종합실습4 추가 요구사항] "다른 명언 보기" 버튼 중복 클릭 방지 상태
let isQuoteLoading = false;

// ----------------------------------------------------------------------------
// 3. 초기 실행
// ----------------------------------------------------------------------------
renderCurrentDate();
resetTimeInputToNow();
goalInput.value = loadGoal();
render();
loadDailyQuote();
todoInput.focus();

// ----------------------------------------------------------------------------
// 4. 이벤트 등록
// ----------------------------------------------------------------------------

// ============================================================================
// [종합실습4 UI 개선] [사용자 직접 요청]
// "Your Goal" 카드의 저장 버튼(또는 입력창 Enter)을 눌렀을 때 목표를 저장합니다.
// todos 상태와는 무관하므로 render()나 saveAndRender()를 호출하지 않습니다.
// ============================================================================
goalForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const newGoal = goalInput.value.trim();
    saveGoal(newGoal);
    goalInput.value = newGoal;
    goalSavedMessage.textContent = "목표를 저장했습니다.";
});

// [종합실습4 접근성] [종합실습4 UI 개선]
// 저장 완료 문구가 표시된 뒤 다시 입력을 시작하면 문구를 지웁니다.
goalInput.addEventListener("input", function () {
    if (goalSavedMessage.textContent !== "") {
        goalSavedMessage.textContent = "";
    }
});

// ============================================================================
// [종합실습4 필수 요구사항] 추가 버튼 또는 Enter 키로 할 일 추가
// input과 add-button이 모두 form 내부에 있으므로, 버튼 클릭과 입력창에서의
// Enter 입력이 전부 이 submit 이벤트 하나로 들어옵니다.
// [한글 입력 오류 방지]
// keydown과 submit을 동시에 사용하면 한글 조합 중 마지막 글자가
// 별도의 할 일로 중복 추가될 수 있으므로 submit 이벤트 하나만 사용합니다.
// ============================================================================
todoForm.addEventListener("submit", function (event) {
    // [종합실습4 필수 요구사항 - 추가 버튼 / Enter 키]
    // submit 버튼 클릭과 입력창 Enter 입력을 모두 이 한 곳에서 처리합니다.
    event.preventDefault();
    addTodo();
});

// ============================================================================
// [종합실습4 접근성] [종합실습4 UI 개선]
// 오류 문구가 표시된 뒤 사용자가 다시 입력을 시작하면 문구를 지웁니다.
// ============================================================================
todoInput.addEventListener("input", function () {
    if (inputMessage.textContent !== "") {
        inputMessage.textContent = "";
    }
});

// ============================================================================
// [종합실습4 세부 요구사항] 필터 버튼 처리
// filterButtons 부모 요소에 리스너를 한 번 등록하여 버튼을 구분합니다.
// ============================================================================
filterButtons.addEventListener("click", function (event) {
    const selectedButton = event.target.closest("button[data-filter]");

    if (selectedButton === null) {
        return;
    }

    currentFilter = selectedButton.dataset.filter;
    updateFilterButtons();
    render();
});

// ============================================================================
// [종합실습4 세부 요구사항] [이벤트 위임]
// 부모 ul인 todoList에 click 리스너를 단 한 번만 등록합니다.
// 새로 생성된 체크박스와 삭제 버튼도 closest()로 찾아 처리합니다.
// ============================================================================
todoList.addEventListener("click", function (event) {
    const todoItem = event.target.closest(".todo-item");

    if (todoItem === null) {
        return;
    }

    const todoId = Number(todoItem.dataset.id);

    if (event.target.closest(".todo-check")) {
        toggleTodo(todoId);
        return;
    }

    if (event.target.closest(".delete-button")) {
        deleteTodo(todoId);
    }
});

// ============================================================================
// [종합실습4 추가 요구사항] 완료 항목 모두 삭제
// ============================================================================
clearCompletedButton.addEventListener("click", function () {
    clearCompletedTodos();
});

// ============================================================================
// [종합실습4 추가 요구사항] 다른 명언 보기 버튼 → 오늘의 한마디를 다시 fetch
// ============================================================================
reloadQuoteButton.addEventListener("click", function () {
    loadDailyQuote();
});

// ----------------------------------------------------------------------------
// 5. 상태 변경 함수
// ----------------------------------------------------------------------------
function addTodo() {
    const newText = todoInput.value.trim();

    // [종합실습4 필수 요구사항] 빈 값 방지
    if (newText === "") {
        inputMessage.textContent = "할 일을 한 글자 이상 입력해 주세요.";
        todoInput.focus();
        return;
    }

    // [종합실습4 데이터 모델 확장] [사용자 직접 요청]
    // 할 일 하나는 { id, text, done, time } 객체입니다.
    // time은 <input type="time">의 값("HH:MM")을 그대로 저장하며,
    // 비어 있으면 빈 문자열로 저장해 "시간 미정" 항목으로 다룹니다.
    const newTodo = {
        id: Date.now(),
        text: newText,
        done: false,
        time: todoTimeInput.value
    };

    // [종합실습4 필수 요구사항] push() 배열 메서드로 상태 변경
    todos.push(newTodo);

    saveAndRender();

    todoForm.reset();
    // [개발자 확인] form.reset()이 시간 입력창도 비우므로, 다음 입력 편의를 위해
    // 현재 시각으로 다시 채워줍니다.
    resetTimeInputToNow();
    inputMessage.textContent = "";
    todoInput.focus();
}

function toggleTodo(todoId) {
    const selectedTodo = todos.find(function (todo) {
        return todo.id === todoId;
    });

    if (selectedTodo === undefined) {
        return;
    }

    // [종합실습4 필수 요구사항] 체크박스로 완료/취소 토글
    // 논리 부정 연산자(!)를 사용하여 true와 false를 서로 전환합니다.
    selectedTodo.done = !selectedTodo.done;
    saveAndRender();
}

function deleteTodo(todoId) {
    // [종합실습4 필수 요구사항] × 버튼으로 삭제
    // filter()로 해당 id를 제외한 새 배열 생성
    todos = todos.filter(function (todo) {
        return todo.id !== todoId;
    });

    saveAndRender();
}

function clearCompletedTodos() {
    // [종합실습4 추가 요구사항]
    // 완료된 항목이 없으면 버튼이 disabled 상태라 이 함수까지 오지 않지만,
    // 방어적으로 한 번 더 확인합니다.
    const hasCompleted = todos.some(function (todo) {
        return todo.done === true;
    });

    if (!hasCompleted) {
        return;
    }

    const confirmed = window.confirm("완료된 할 일을 모두 삭제할까요? 이 작업은 되돌릴 수 없습니다.");

    if (!confirmed) {
        return;
    }

    // [종합실습4 추가 요구사항] filter()로 완료되지 않은 항목만 남깁니다.
    todos = todos.filter(function (todo) {
        return todo.done === false;
    });

    saveAndRender();
}

function saveAndRender() {
    // [동기 처리] localStorage 저장을 완료한 다음 render()를 순서대로 실행합니다.
    // [개발자 확인] 상태를 바꾸는 함수는 반드시 saveTodos()와 render()를 함께 실행합니다.
    saveTodos(todos);
    render();
}

// ----------------------------------------------------------------------------
// 6. 화면 렌더링
// ----------------------------------------------------------------------------
function render() {
    // [개발자 확인] 배열 상태가 변경될 때마다 화면을 다시 그리는 흐름입니다.
    // [종합실습4 UI 개선] [사용자 직접 요청]
    // 필터링한 다음 시간순으로 정렬해 타임라인 순서와 목록 순서를 맞춥니다.
    const visibleTodos = getSortedTodos(getFilteredTodos());

    todoList.replaceChildren();
    todoList.classList.toggle("is-empty", visibleTodos.length === 0);

    // [종합실습4 필수 요구사항 - 조건문]
    // 표시할 항목의 존재 여부에 따라 빈 화면 또는 할 일 목록을 렌더링합니다.
    if (visibleTodos.length === 0) {
        renderEmptyState();
    } else {
        // [종합실습4 필수 요구사항 - 반복문]
        // 배열에 들어 있는 할 일 객체를 for...of 반복문으로 하나씩 DOM에 추가합니다.
        for (const todo of visibleTodos) {
            todoList.appendChild(createTodoElement(todo));
        }
    }

    updateSummary();
}

function getFilteredTodos() {
    // [종합실습4 세부 요구사항] 전체 / 진행중 / 완료 필터
    if (currentFilter === "active") {
        return todos.filter(function (todo) {
            return todo.done === false;
        });
    }

    if (currentFilter === "completed") {
        return todos.filter(function (todo) {
            return todo.done === true;
        });
    }

    return todos;
}

function getSortedTodos(list) {
    // [종합실습4 추가 요구사항] [사용자 직접 요청]
    // time이 "HH:MM" 형식 문자열이면 사전순 비교가 곧 시간순 비교와 같으므로
    // localeCompare()로 오름차순 정렬합니다. time이 없는(빈 문자열) 항목은
    // "시간 미정"으로 취급해 목록 맨 뒤로 보냅니다.
    return [...list].sort(function (a, b) {
        if (a.time === "" && b.time === "") {
            return 0;
        }

        if (a.time === "") {
            return 1;
        }

        if (b.time === "") {
            return -1;
        }

        return a.time.localeCompare(b.time);
    });
}

function createTodoElement(todo) {
    // [종합실습4 필수 요구사항] createElement()로 동적 DOM 생성
    const item = document.createElement("li");
    item.className = "todo-item";

    // [종합실습4 필수 요구사항] dataset으로 객체 id를 DOM 요소에 저장
    item.dataset.id = String(todo.id);

    if (todo.done) {
        item.classList.add("is-completed");
    }

    // [종합실습4 UI 개선] [사용자 직접 요청]
    // 시간순 정렬과 어울리도록 각 항목 왼쪽에 타임라인 점 + 시간 배지를 둡니다.
    const timeTrack = document.createElement("div");
    timeTrack.className = "todo-time-track";

    const timeDot = document.createElement("span");
    timeDot.className = "todo-time-dot";
    timeDot.setAttribute("aria-hidden", "true");

    const timeBadge = document.createElement("span");
    timeBadge.className = "todo-time-badge";

    if (todo.time === "") {
        timeBadge.classList.add("is-unset");
        timeBadge.textContent = "시간 미정";
    } else {
        timeBadge.textContent = todo.time;
    }

    timeTrack.append(timeDot, timeBadge);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "todo-check";
    checkbox.checked = todo.done;
    checkbox.setAttribute("aria-label", todo.done ? "완료 취소" : "완료 표시");

    const text = document.createElement("span");
    text.className = "todo-text";
    text.textContent = todo.text;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "×";
    // [종합실습4 접근성] 어떤 항목을 삭제하는지 스크린 리더에도 전달합니다.
    // 예: "JavaScript 복습하기 할 일 삭제"
    deleteButton.setAttribute("aria-label", `${todo.text} 할 일 삭제`);

    item.append(timeTrack, checkbox, text, deleteButton);
    return item;
}

function renderEmptyState() {
    // [종합실습4 추가 요구사항]
    // 빈 목록 안내는 화면에만 표시하는 문구이므로 todos 배열에는 추가하지 않습니다.
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-state";

    if (currentFilter === "active") {
        emptyItem.textContent = "진행중 항목이 없습니다.";
    } else if (currentFilter === "completed") {
        emptyItem.textContent = "완료된 항목이 없습니다.";
    } else {
        emptyItem.textContent = "아직 등록된 할 일이 없습니다. 오늘의 첫 계획을 추가해 보세요.";
    }

    todoList.appendChild(emptyItem);
}

function updateSummary() {
    // [종합실습4 세부 요구사항] 하단 전체·완료 개수 표시
    // [종합실습4 추가 요구사항] 남은 개수와 완료율은 기존 todos 배열의
    // done 값만으로 계산하므로 { id, text, done, time } 중 done만 사용합니다.
    const doneTodos = todos.filter(function (todo) {
        return todo.done === true;
    });
    const remainingTodos = todos.filter(function (todo) {
        return todo.done === false;
    });

    const totalNum = todos.length;
    const doneNum = doneTodos.length;
    const remainingNum = remainingTodos.length;

    // [종합실습4 추가 요구사항] 할 일이 0개일 때 완료율은 0%로 처리합니다.
    const completionRate = totalNum === 0 ? 0 : Math.round((doneNum / totalNum) * 100);

    totalCount.textContent = String(totalNum);
    completedCount.textContent = String(doneNum);
    remainingCount.textContent = String(remainingNum);

    progressBarFill.style.width = `${completionRate}%`;
    progressBar.setAttribute("aria-valuenow", String(completionRate));
    progressPercent.textContent = `완료율 ${completionRate}%`;

    // [종합실습4 추가 요구사항] 완료된 항목이 있을 때만 모두 삭제 버튼을 활성화합니다.
    clearCompletedButton.disabled = doneNum === 0;
}

function updateFilterButtons() {
    const buttons = filterButtons.querySelectorAll("button[data-filter]");

    buttons.forEach(function (button) {
        const isSelected = button.dataset.filter === currentFilter;
        button.classList.toggle("is-active", isSelected);
        // [종합실습4 접근성] 키보드/스크린 리더 사용자도 선택 상태를 확인할 수 있습니다.
        // 색상만으로 전달하지 않고 aria-pressed 속성도 함께 갱신합니다.
        button.setAttribute("aria-pressed", String(isSelected));
    });
}

// ----------------------------------------------------------------------------
// 7. 현재 날짜 / 시간 입력 도우미
// ----------------------------------------------------------------------------
function renderCurrentDate() {
    // [종합실습4 추가 요구사항] Intl.DateTimeFormat으로 "2026년 7월 18일 토요일" 형태를 만듭니다.
    const formatter = new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long"
    });

    currentDateEl.textContent = formatter.format(new Date());
}

function getCurrentTimeValue() {
    // [종합실습4 데이터 모델 확장] [사용자 직접 요청]
    // <input type="time">의 value 형식("HH:MM", 24시간제)에 맞춰 현재 시각을 만듭니다.
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}

function resetTimeInputToNow() {
    todoTimeInput.value = getCurrentTimeValue();
}

// ----------------------------------------------------------------------------
// 8. 비동기 데이터 로드
// ----------------------------------------------------------------------------
async function loadDailyQuote() {
    // ========================================================================
    // [종합실습4 추가 요구사항] async/await + fetch 비동기 데이터 로드
    // [비동기 처리] 서버 응답을 기다리는 동안 브라우저 전체는 멈추지 않습니다.
    // [종합실습4 추가 요구사항] "다른 명언 보기" 버튼을 눌러도 로딩 중에는
    // 중복 요청이 발생하지 않도록 isQuoteLoading으로 막습니다.
    // ========================================================================
    if (isQuoteLoading) {
        return;
    }

    isQuoteLoading = true;
    reloadQuoteButton.disabled = true;
    reloadQuoteButton.textContent = "불러오는 중...";

    quoteText.textContent = "오늘의 한마디를 불러오는 중입니다...";
    quoteTranslation.textContent = "";
    quoteAuthor.textContent = "";

    try {
        const response = await fetch(QUOTES_DATA_URL);

        if (!response.ok) {
            throw new Error(`HTTP 오류: ${response.status}`);
        }

        const quotes = await response.json();

        if (!Array.isArray(quotes) || quotes.length === 0) {
            throw new Error("사용할 명언 데이터가 없습니다.");
        }

        const nextQuote = pickRandomQuote(quotes);
        lastQuoteId = nextQuote.id;

        quoteText.textContent = `“${nextQuote.en}”`;
        quoteTranslation.textContent = `“${nextQuote.ko}”`;
        quoteAuthor.textContent = nextQuote.author ? `— ${nextQuote.author}` : "";
    } catch (error) {
        // [종합실습4 추가 요구사항] try/catch 예외 처리와 실패 시 기본 영문·한국어 문구
        console.error("오늘의 한마디를 불러오지 못했습니다.", error);
        quoteText.textContent = `“${DEFAULT_QUOTE_EN}”`;
        quoteTranslation.textContent = `“${DEFAULT_QUOTE_KO}”`;
        quoteAuthor.textContent = "— 기본 문구";
    } finally {
        isQuoteLoading = false;
        reloadQuoteButton.disabled = false;
        reloadQuoteButton.textContent = "다른 명언 보기";
    }
}

function pickRandomQuote(quotes) {
    // [종합실습4 추가 요구사항] 같은 명언이 연속으로 뽑히지 않도록 재시도합니다.
    if (quotes.length === 1) {
        return quotes[0];
    }

    let candidate = quotes[Math.floor(Math.random() * quotes.length)];
    let attempts = 0;

    while (candidate.id === lastQuoteId && attempts < 10) {
        candidate = quotes[Math.floor(Math.random() * quotes.length)];
        attempts = attempts + 1;
    }

    return candidate;
}

// ----------------------------------------------------------------------------
// [추후 확장 아이디어]
// 아래 기능들은 실제 서비스에는 유용하지만, 이번 제출본에는 적용하지 않았습니다.
// date(날짜)·memo·priority 필드를 추가하면 { id, text, done, time }보다
// 데이터 구조가 더 복잡해지므로, 아이디어로만 남겨둡니다.
//
// - 날짜별 계획을 볼 수 있는 달력 뷰
// - 할 일별 상세 메모
// - 중요도 또는 우선순위 태그
// - 마감일 알림 (예: 브라우저 알림, 색상 강조)
// ----------------------------------------------------------------------------

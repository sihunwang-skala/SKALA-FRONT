// 어려운 AI 기능은 아니고, 질문에 특정 단어가 있는지 보고 미리 적어둔 답을 보여준다.
const answers = [
  {
    words: ["아이디", "id", "계정"],
    text: "아이디는 영문과 숫자로 4~12자 입력하면 됩니다.\n예: skala2026, web1234"
  },
  {
    words: ["비밀번호", "패스워드", "암호"],
    text: "비밀번호는 8자 이상 입력해 주세요.\n예: skala2026"
  },
  {
    words: ["이메일", "메일", "email"],
    text: "이메일 형식으로 입력해 주세요.\n예: student@example.com"
  },
  {
    words: ["전화", "휴대폰", "번호"],
    text: "전화번호는 하이픈을 넣어 010-0000-0000 형식으로 입력해 주세요."
  },
  {
    words: ["필수", "required", "꼭"],
    text: "별표(*)가 있는 이름, 아이디, 비밀번호, 이메일, 약관 동의는 필수입니다."
  },
  {
    words: ["관심", "분야", "복수", "체크박스"],
    text: "관심 분야는 여러 개 선택할 수 있고 결과 페이지에 모두 표시됩니다."
  },
  {
    words: ["약관", "동의", "개인정보"],
    text: "약관 동의는 필수예요. 체크하지 않으면 결과 페이지로 넘어가지 않습니다."
  }
];

const otherAnswer =
  "아이디, 비밀번호, 이메일, 전화번호, 필수 항목, 관심 분야, 약관 동의에 대해 물어봐 주세요.";

const chatBox = document.querySelector("#helper-messages");
const chatForm = document.querySelector("#helper-form");
const chatInput = document.querySelector("#helper-input");
const quickBtns = document.querySelectorAll(".helper-quick-questions button");

function findAnswer(question) {
  const questionText = question.toLowerCase();

  for (const item of answers) {
    const hasWord = item.words.some((word) => questionText.includes(word.toLowerCase()));
    if (hasWord) return item.text;
  }

  return otherAnswer;
}

function addMessage(text, type) {
  const message = document.createElement("div");
  message.className = `helper-message ${type}`;

  // 사용자가 입력한 문장은 HTML로 넣지 않고 글자로만 표시한다.
  message.textContent = text;
  chatBox.appendChild(message);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function ask(question) {
  const text = question.trim();
  if (!text) return;

  addMessage(text, "user-message");
  addMessage(findAnswer(text), "bot-message");
}

if (chatBox && chatForm && chatInput) {
  // 위에 있는 빠른 질문 버튼들
  quickBtns.forEach((button) => {
    button.addEventListener("click", () => ask(button.dataset.question));
  });

  // 직접 질문을 입력했을 때
  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    ask(chatInput.value);
    chatInput.value = "";
    chatInput.focus();
  });
}

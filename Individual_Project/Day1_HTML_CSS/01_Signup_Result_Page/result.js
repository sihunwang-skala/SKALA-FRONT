// GET 방식으로 넘어온 값은 주소의 ? 뒤에 있어서 URLSearchParams로 읽는다.
const params = new URLSearchParams(window.location.search);

// 입력하지 않은 항목은 실제 값이랑 구분해서 조금 흐리게 표시한다.
const emptyTexts = ["입력하지 않음", "선택하지 않음", "작성하지 않음", "동의하지 않음"];

function getValue(name, emptyText = "입력하지 않음") {
  const value = params.get(name);
  return value && value.trim() ? value : emptyText;
}

// 표의 td를 계속 찾는 코드가 반복돼서 함수로 묶었다.
function putText(id, text) {
  const cell = document.querySelector(`#${id}`);
  if (!cell) return;

  cell.textContent = text;
  cell.classList.toggle("empty-value", emptyTexts.includes(text));
}

putText("result-name", getValue("userName"));
putText("result-id", getValue("userId"));

// 비밀번호를 그대로 보여주기보다는 입력한 길이만 알 수 있게 점으로 표시
const password = getValue("userPassword");
const passwordDots = password === "입력하지 않음" ? password : "•".repeat(password.length);
putText("result-password", passwordDots);

putText("result-email", getValue("userEmail"));
putText("result-tel", getValue("userTel"));
putText("result-birth", getValue("userBirth"));
putText("result-gender", getValue("gender", "선택하지 않음"));

// checkbox는 같은 name으로 여러 값이 오기 때문에 getAll 사용
const interestList = params.getAll("interest");
const interestResult = interestList.length ? interestList.join(", ") : "선택하지 않음";
putText("result-interest", interestResult);

putText("result-region", getValue("region", "선택하지 않음"));
putText("result-introduction", getValue("introduction", "작성하지 않음"));

const terms = getValue("termsAgreement", "동의하지 않음");
putText("result-terms", terms === "동의함" ? "✓ 동의함" : terms);

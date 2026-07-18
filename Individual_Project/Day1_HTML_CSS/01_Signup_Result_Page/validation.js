// date 입력은 HTML에 max를 바로 적으면 매일 바꿔야 해서 JS로 오늘 날짜를 넣었다.
const birthInput = document.querySelector("#userBirth");

if (birthInput) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");

  // 미래 날짜가 선택되지 않도록 max 설정
  birthInput.max = `${year}-${month}-${date}`;
}

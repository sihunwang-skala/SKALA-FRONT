# Chicago Travel Guide

2025년 6월에 방문한 미국 시카고의 명소, 음식, 여행 팁과 영상을 정리한 여행 소개 페이지입니다. 수업에서 배운 HTML 시맨틱 태그와 CSS 레이아웃을 기본으로 사용하고, 개인 여행 사진과 Google My Maps, 음식별 맛집 순위 페이지를 추가했습니다.

## 실행 방법

프로젝트 폴더에서 아래 파일을 브라우저로 실행합니다.

```text
html/myTrip.html
```

## 주요 구성

- 시카고 여행 소개
- 개인 여행 사진으로 만든 명소 갤러리
- Google My Maps 여행 지도
- 시카고 대표 음식 3가지
- 여행 팁
- Chicago Riverwalk 여행 영상
- 음식별 맛집 순위 페이지
- 맛집 카드에서 Google 지도 검색 연결

## 과제 요구사항 적용

- `header`, `nav`, `main`, `section`, `article`, `aside`, `footer` 사용
- 상단 고정 내비게이션과 페이지 내부 앵커 이동
- Hero 배경 이미지와 그라데이션 중첩
- `figure`와 `figcaption`을 사용한 명소 카드 3개
- 이미지 `alt` 작성
- 카드 hover와 transition 효과
- 먹거리 `article`과 여행 팁 `aside`의 2단 배치
- `video`, `controls`, `poster`, `source` 적용
- 미디어쿼리를 이용한 반응형 레이아웃
- 외부 이미지와 참고 자료 출처 표시

## 수업 내용을 바탕으로 확장한 부분

수업에서 배운 박스 모델, Flex, Grid, position, hover, 상대 경로와 미디어쿼리를 실제 여행 페이지 구조에 맞게 적용했습니다. 명소와 음식은 카드 형태로 정리하고, 넓은 화면과 작은 화면에서 배치가 자연스럽게 바뀌도록 구성했습니다.

## 수업 범위 외에 추가한 부분

### Google My Maps

Cloud Gate, Navy Pier, 3 Arts Club Cafe at RH Chicago, Chicago Riverwalk를 지도에 표시했습니다. 별도의 API Key 없이 iframe 방식으로 삽입했습니다.

### 음식별 맛집 순위

`Food_Place_Ranking/index.html`에 시카고 3대 음식별 맛집을 3곳씩 정리했습니다.

- Deep-Dish Pizza: Chowhound 참고
- Chicago-Style Hot Dog: Time Out Chicago 참고
- Italian Beef Sandwich: The Infatuation 참고

맛집 카드의 사진을 누르면 해당 식당의 Google 지도 검색 결과가 새 탭에서 열립니다.

## 폴더 구성

```text
02_Travel_Destination_Page/
├── html/
│   └── myTrip.html
├── css/
│   └── style.css
├── media/
│   ├── 개인 여행 사진
│   ├── 음식 이미지
│   ├── Hero 및 영상 대표 이미지
│   └── riverwalk.mp4
└── Food_Place_Ranking/
    ├── index.html
    ├── style.css
    └── images/
```

## 작동 방식

1. `myTrip.html`을 실행합니다.
2. 상단 메뉴를 눌러 여행 소개, 갤러리, 지도, 먹거리, 여행 팁, 영상으로 이동합니다.
3. 명소 카드에 마우스를 올리면 이미지가 확대됩니다.
4. 먹거리 영역에서 **음식별 맛집 순위 보러가기**를 누르면 맛집 페이지로 이동합니다.
5. 맛집 카드의 사진을 누르면 Google 지도 검색 결과가 열립니다.
6. 맛집 페이지의 돌아가기 링크를 누르면 여행 페이지의 먹거리 영역으로 돌아옵니다.

## 참고 사항

- 일부 맛집 이미지는 해당 식당의 실제 사진이 아닐 수 있으며, 카드 아래에 별도로 표시했습니다.
- 외부 이미지와 순위 자료는 각 페이지에 출처 링크를 작성했습니다.
- 원본 MOV 영상은 보관하고, 브라우저 재생을 위해 MP4 파일을 사용했습니다.

## 작성자

왕시훈

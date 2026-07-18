

const STORAGE_KEY = "interactiveTodoApp.todos";


export function loadTodos() {
    try {
        const savedText = localStorage.getItem(STORAGE_KEY);

        // [동기 처리] localStorage.getItem()은 즉시 값을 읽어오는 동기 API입니다.
        if (savedText === null) {
            return [];
        }

        const parsedTodos = JSON.parse(savedText);

        if (!Array.isArray(parsedTodos)) {
            return [];
        }

        // [개발자 확인] [종합실습4 데이터 모델 확장]
        // 필수 필드({ id, text, done })가 갖춰진 항목만 남기고,
        // time은 있으면 그대로, 없으면 빈 문자열("시간 미정")로 채웁니다.
        return parsedTodos
            .filter(function (todo) {
                return (
                    todo !== null &&
                    typeof todo === "object" &&
                    typeof todo.id === "number" &&
                    typeof todo.text === "string" &&
                    typeof todo.done === "boolean"
                );
            })
            .map(function (todo) {
                return {
                    id: todo.id,
                    text: todo.text,
                    done: todo.done,
                    time: typeof todo.time === "string" ? todo.time : ""
                };
            });
    } catch (error) {
        console.error("할 일 데이터를 복원하지 못했습니다.", error);
        return [];
    }
}

/**
 * 할 일 배열을 localStorage에 저장합니다.
 *
 * [종합실습4 추가 요구사항]
 * - JSON.stringify()로 배열을 문자열로 변환
 * - 새로고침 후에도 데이터 유지
 */
export function saveTodos(todos) {
    try {
        const jsonText = JSON.stringify(todos);

        // [동기 처리] localStorage.setItem()은 브라우저 저장소에 즉시 기록합니다.
        localStorage.setItem(STORAGE_KEY, jsonText);
    } catch (error) {
        console.error("할 일 데이터를 저장하지 못했습니다.", error);
    }
}


const GOAL_STORAGE_KEY = "interactiveTodoApp.userGoal";

/**
 * localStorage에서 사용자가 적어 둔 목표 문구를 복원합니다.
 * 저장된 값이 없으면 빈 문자열을 반환합니다.
 */
export function loadGoal() {
    try {
        const savedGoal = localStorage.getItem(GOAL_STORAGE_KEY);

        // [동기 처리] localStorage.getItem()은 즉시 값을 읽어오는 동기 API입니다.
        return typeof savedGoal === "string" ? savedGoal : "";
    } catch (error) {
        console.error("목표를 복원하지 못했습니다.", error);
        return "";
    }
}

/**
 * 목표 문구를 localStorage에 저장합니다.
 */
export function saveGoal(goal) {
    try {
        // [동기 처리] localStorage.setItem()은 브라우저 저장소에 즉시 기록합니다.
        localStorage.setItem(GOAL_STORAGE_KEY, goal);
    } catch (error) {
        console.error("목표를 저장하지 못했습니다.", error);
    }
}

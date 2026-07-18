import {
    WebWorkerMLCEngineHandler
} from "https://esm.run/@mlc-ai/web-llm";

// 모델 연산을 별도 스레드에서 처리해 화면이 멈추지 않게 한다.
const handler = new WebWorkerMLCEngineHandler();

self.onmessage = function(event) {
    handler.onmessage(event);
};

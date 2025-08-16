# Rubik's Cube MCP Server - 개발자 가이드

## 프로젝트 목적

이 프로젝트는 Model Context Protocol(MCP) 기반의 루빅스 큐브 게임 서버를 구현합니다.  
AI 에이전트와 클라이언트가 MCP를 통해 큐브를 조작하고, UI 리소스를 안전하게 전달받아 웹에서 인터랙티브하게 게임을 즐길 수 있도록 설계되었습니다.  
MCP UI 표준을 활용하여 서버에서 동적으로 생성한 UI(예: 게임 링크, 버튼 등)를 클라이언트에 전달하고, 사용자가 직접 클릭하여 게임을 시작하거나 조작할 수 있습니다.

## 테크 스택 / 기술 / 언어

- **TypeScript**: 주요 서버 및 MCP 도구 구현
- **Node.js**: 서버 런타임 환경
- **Express**: HTTP 서버 및 API 구현 (예시/테스트용)
- **Zod**: 입력 데이터 검증 및 스키마 정의
- **@modelcontextprotocol/sdk**: MCP 서버/클라이언트 SDK
- **@mcp-ui/server, @mcp-ui/client**: MCP UI 리소스 생성 및 렌더링
- **Custom Cube Logic**: 루빅스 큐브 상태 관리 및 조작

## 주요 의존성

- `@modelcontextprotocol/sdk`: MCP 서버/클라이언트 통신 및 도구 등록
- `@mcp-ui/server`: 서버에서 UI 리소스 생성
- `@mcp-ui/client`: 클라이언트에서 UI 리소스 렌더링
- `zod`: 입력값 검증 및 타입 안전성 확보
- `express`, `cors`: HTTP API 및 CORS 처리 (테스트/예시용)
- 기타: 프로젝트 내 커스텀 큐브 로직, 시각화 서버 등

## Best Practice

- **MCP 도구 등록 시 입력값 검증**  
  모든 도구(tool) 입력값은 Zod 스키마로 명확하게 검증하고, 기본값 및 타입을 명시합니다.

- **게임 세션 관리**  
  각 게임은 고유한 `gameId`로 관리하며, 큐브 상태와 세션 정보를 Map 등으로 저장합니다.

- **UI 리소스와 데이터 동시 반환**  
  MCP UI 리소스(예: 게임 링크)와 게임의 초기값(큐브 상태 등)을 `content: [uiResponse, response]` 형태로 함께 반환하여 클라이언트가 UI와 데이터를 동시에 활용할 수 있도록 합니다.

- **MCP UI 표준 활용**  
  UI 리소스는 반드시 `createUIResource` 또는 명확한 타입 구조(`type: "resource"`, `mimeType`, `text` 등)로 생성합니다.  
  클라이언트에서는 `UIResourceRenderer` 또는 `<ui-resource-renderer>` 웹 컴포넌트로 렌더링합니다.

- **상태 변화 및 이벤트 처리**  
  큐브 조작, 게임 완료 등 주요 이벤트 발생 시 세션 상태와 시각화 서버를 반드시 업데이트합니다.

- **코드 일관성 및 타입 안전성**  
  TypeScript의 타입 시스템을 적극 활용하여, 모든 함수/객체에 타입을 명확히 지정합니다.

- **문서화 및 예시 코드 제공**  
  각 MCP 도구, UI 리소스 생성, 클라이언트 렌더링 예시를 문서에 포함하여 신규 개발자가 쉽게 이해할 수 있도록 합니다.

- **에러 처리 및 로그**  
  예외 상황(존재하지 않는 게임, 잘못된 입력 등)은 명확한 에러 메시지와 로그로 처리합니다.

## 참고

- MCP 및 MCP UI 표준 문서: [modelcontextprotocol.io/introduction](https://modelcontextprotocol.io/introduction)
- MCP UI SDK: [@mcp-ui/server](https://www.npmjs.com/package/@mcp-ui/server), [@mcp-ui/client](https://www.npmjs.com/package/@mcp-ui/client)
- 예시 코드 및 리팩터링
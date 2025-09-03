# Refactoring Plan

## 목표

- 게임 시작 시 scramble 동작에 대해 난이도(섞기 횟수)를 명확히 지정할 수 있도록 리팩터링한다.
- MCP UI를 활용해 게임의 URL을 사용자가 클릭할 수 있는 링크 형태로 전달하는 기능을 추가한다.
- 게임의 초기값(큐브 상태 등)도 함께 반환하여 클라이언트가 바로 렌더링할 수 있도록 한다.

## 문제점

- 현재 MCP 도구 `startCube`에서 scramble 옵션을 켜면 `RubiksCube.scramble()` 메서드가 항상 20번의 무작위 move로만 섞임.
- `startCube` 도구에서 난이도(scramble move 횟수) 값을 전달할 수 있는 파라미터가 없음.
- AI 에이전트가 다양한 난이도의 큐브 퍼즐을 요청할 수 없음 (항상 20-move scramble로 고정).
- 웹 인터페이스나 API를 통해 사용자가 난이도를 조절할 수 없음.
- 게임 시작 후, 사용자가 직접 클릭해서 게임을 시작할 수 있는 UI가 없음.
- 게임의 초기값(큐브 상태 등)이 별도로 반환되지 않아 클라이언트가 상태를 관리하기 어렵다.

## 개선 방향

1. 함수 서명 변경

- MCP 도구 `startCube`에 `difficulty`(number) 파라미터를 추가하고 기본값을 20으로 설정.
- Zod 스키마 예시:  
  `difficulty: z.number().min(1).max(100).optional().describe("Number of scramble moves (1-100)")`

2. scramble 호출에 난이도 전달

- 기존: `if (scramble) { cube.scramble(); }`
- 변경: `if (scramble) { cube.scramble(difficulty || 20); }`

3. API/핸들러 연동

- 클라이언트가 보낸 요청에서 `difficulty` 값을 읽어 MCP 서버에 전달하도록 수정.

4. 입력 검증 및 기본값

- `difficulty`는 양의 정수로 제한(예: 최소 1, 최대 100 또는 프로젝트 규칙에 맞게 설정).
- 잘못된 값일 경우 기본값(20)으로 대체.

5. 게임의 초기값 반환

- 큐브의 상태, 난이도 등 게임의 초기값을 response 객체로 반환.

6. **게임 URL을 클릭할 수 있는 링크로 전달 (MCP UI 활용)**

- 게임이 시작되면, 게임의 URL을 포함한 UI 리소스를 생성하여 MCP UI를 통해 클라이언트에 전달.
- 사용자는 MCP UI 클라이언트에서 해당 링크를 클릭하여 게임을 시작할 수 있음.

7. **MCP UI 리소스와 게임 초기값을 동시에 반환**

- `content: [uiResponse, response]` 형태로 MCP UI 리소스와 게임 초기값을 함께 반환.

## MCP UI 기본 개념 및 활용 예시

### MCP UI란?

- MCP UI는 서버에서 동적으로 생성한 UI 리소스를 클라이언트에 전달하고, 클라이언트가 이를 안전하게 렌더링할 수 있도록 하는 표준 프로토콜이다.
- 대표적으로 `@mcp-ui/server`에서 `createUIResource`를 사용해 UI 리소스를 만들고, 클라이언트에서는 `@mcp-ui/client`의 `UIResourceRenderer`로 렌더링한다.

### 게임 URL을 링크로 전달하는 MCP UI 예시

#### 서버 코드 예시 (TypeScript)

```typescript
this.mcpServer.tool(
  "startCube",
  "Initialize a new Rubik's Cube game session",
  {
    scramble: z.boolean().optional().describe("Whether to scramble the cube initially"),
    difficulty: z.number().min(1).max(100).optional().describe("Number of scramble moves (1-100)")
  },
  async ({ scramble = true, difficulty = 20 }: { scramble?: boolean; difficulty?: number }) => {
    const gameId = `cube_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const cube = new RubiksCube();

    if (scramble) {
      cube.scramble(difficulty);
    }

    const session: GameSession = {
      id: gameId,
      cubeState: cube.getState(),
      createdAt: Date.now(),
      lastActivity: Date.now(),
      status: 'active'
    };

    this.games.set(gameId, { cube, session });
    this.visualizationServer.registerSession(session);

    const currentState = cube.getState();
    const response: CubeResponse = {
      gameId,
      cube: currentState,
      scrambleMoves: difficulty,
      nextAction: currentState.solved ? "finish" : "manipulateCube"
    };

    // MCP UI 리소스 생성 (예: 게임 링크)
    const gameUrl = `http://localhost:3000/game/${gameId}`;
    const uiResponse = {
      type: "resource",
      resource: {
        uri: `ui://game-link/${gameId}`,
        mimeType: "text/html",
        text: `<a href="${gameUrl}" target="_blank">게임 시작하기</a>`
      }
    };

    return {
      content: [
        uiResponse,
        { type: "text", text: JSON.stringify(response, null, 2) }
      ]
    };
  }
);
```

#### 클라이언트 코드 예시 (React)

```tsx
import React from 'react';
import { UIResourceRenderer } from '@mcp-ui/client';

function App({ mcpResource }) {
  if (
    mcpResource.type === 'resource' &&
    mcpResource.resource.uri?.startsWith('ui://')
  ) {
    return (
      <UIResourceRenderer
        resource={mcpResource.resource}
        onUIAction={(result) => {
          console.log('Action:', result);
        }}
      />
    );
  }
  return <p>Unsupported resource</p>;
}
```

#### Web Component 예시

```html
<ui-resource-renderer
  resource='{ "mimeType": "text/html", "text": "<a href=\"https://game.example.com\" target=\"_blank\">게임 시작하기</a>" }'
></ui-resource-renderer>
```

### MCP UI를 활용한 작업 흐름

1. 서버에서 게임 URL을 포함한 UI 리소스를 생성 (`createUIResource`)
2. 클라이언트에서 해당 리소스를 받아 `UIResourceRenderer`로 렌더링
3. 사용자는 UI에서 링크를 클릭하여 게임을 시작
4. 동시에 게임의 초기값(response)도 받아서 상태 관리 및 렌더링에 활용

## 호출 예시

```typescript
// AI 에이전트 호출 예시
await mcpClient.call("startCube", { scramble: true, difficulty: 5 });   // 쉬운 난이도: 5번 섞기
await mcpClient.call("startCube", { scramble: true, difficulty: 30 });  // 어려운 난이도: 30번 섞기
await mcpClient.call("startCube", { scramble: false });                 // 섞지 않고 시작
```

## 검증(권장)

- TypeScript 컴파일 확인: `npm run build` 또는 `npm run dev`
- 수동 테스트: MCP 도구 호출하여 난이도별 섞기 동작 및 UI 링크 반환 확인
- 웹 인터페이스 테스트: `http://localhost:3000/game/{gameId}`에서 3D 큐브 상태 확인
- MCP UI 클라이언트에서 링크 클릭 동작 및 초기값 활용 확인

## 비고

- `scramble` 구현이 랜덤 move를 연속 호출하는 방식이라면, `difficulty=1`은 정확히 1번의 move가 적용된 상태를 의미함.
- 클라이언트가 난이도를 사람이 읽기 쉬운 라벨(예: easy/medium/hard)으로 보낼 경우 서버에서 라벨을 숫자 move로 매핑하는 유틸을 추가하는 것을 권장.
- MCP UI를 활용하면 다양한 형태의 UI(링크, 버튼, iframe 등)를 안전하게 전달할 수 있으므로, 게임 외에도 여러 인터랙티브 기능을 쉽게
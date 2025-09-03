# Rubik's Cube MCP Server 확장 개발 계획

## 목표

1. 웹 페이지에서 게임 생성/관리 기능 추가
2. AI Agent가 기존 게임에 참여할 수 있는 `joinGame` MCP 도구 추가
3. MCP UI를 통한 클릭 가능한 게임 링크 제공

## 필요한 작업 파일 분석

### 1. 핵심 MCP 서버 로직 수정

- **`src/app.ts`** ⭐ 가장 중요
  - `startCube` 도구: MCP UI 리소스 + 게임 초기값 동시 반환
  - `joinGame` 도구 신규 추가
  - `GameSession`에 `scrambleMoves` 메타데이터 저장
  - `finish` 도구 응답 보완

### 2. 타입 정의 보강

- **`src/types.ts`**
  - `GameSession` 인터페이스에 `scrambleMoves` 필드 추가
  - `CubeResponse` 타입 명확화
  - MCP UI 리소스 관련 타입 추가

### 3. 큐브 로직 검증

- **`src/cubeLogic.ts`**
  - `scramble(moves: number)` 파라미터 구현 확인
  - `getState()` 직렬화 형식 검증

### 4. 웹 API 확장

- **`src/visualization/APIRoutes.ts`**
  - `GET /api/games`: 게임 목록 조회
  - `POST /api/games`: 새 게임 생성 (난이도 포함)
  - 기존 API와 통합

### 5. 시각화 서버 보강

- **`src/visualizationServer.ts`** 또는 **`src/visualization/VisualizationServer.ts`**
  - `getSessions()` 메서드 추가 (게임 목록 반환용)
  - 세션 메타데이터 관리 개선

### 6. WebSocket 핸들러 (선택사항)

- **`src/visualization/WebSocketHandler.ts`**
  - 게임 생성/변경 시 실시간 브로드캐스트 (필요시)

### 7. 프론트엔드 추가 (신규)

- **게임 목록 페이지**: `views/gameList.ejs` 또는 `public/gameList.html`
- **JavaScript 클라이언트**: `public/scripts/gameList.js`
- **스타일링**: `public/styles/gameList.css`

## 구현 단계

### Phase 1: MCP 서버 핵심 기능 ⭐

1. `src/types.ts` - 타입 정의 보강
2. `src/app.ts` - `startCube`, `joinGame` 도구 구현
3. 기본 테스트 (MCP 도구 호출 확인)

### Phase 2: 웹 API 확장

1. `src/visualization/APIRoutes.ts` - REST API 엔드포인트 추가
2. `src/visualizationServer.ts` - 세션 관리 API 보강
3. API 테스트 (Postman/curl)

### Phase 3: 프론트엔드 구현

1. 게임 목록 페이지 HTML/CSS
2. 게임 생성 모달 JavaScript
3. "Copy Join Prompt" 기능 구현
4. UI/UX 테스트

## 구체적 구현 내용

### MCP UI 리소스 예시

```typescript
const uiResponse = {
  type: "resource",
  resource: {
    uri: `ui://game-link/${gameId}`,
    mimeType: "text/html",
    text: `<a href="http://localhost:3000/game/${gameId}" target="_blank">🎮 게임 시작하기</a>`,
  },
} as const;
```

### Copy Join Prompt 텍스트 예시

```
Join the Rubik's Cube game with gameId: cube_1234567890_abc123, using the joinGame tool in your MCP client.
```

### API 엔드포인트 설계

- `GET /api/games` → 게임 목록 반환
- `POST /api/games { scramble: boolean, difficulty: number }` → 새 게임 생성
- `GET /api/games/:gameId` → 특정 게임 상태 조회 (선택)

### 프론트엔드 기능

- ✅ 새 게임 버튼
- ✅ 난이도 설정 모달 (1-100 슬라이더)
- ✅ 게임 목록 테이블/카드
- ✅ 각 게임별 "Copy Join Prompt" 버튼
- ✅ 게임 상태 표시 (활성/완료)
- ✅ 실시간 목록 갱신 (선택)

## 예상 파일 구조 (추가)

```
views/
  gameList.ejs          # 게임 목록 페이지
public/
  scripts/
    gameList.js         # 게임 목록 관리 로직
  styles/
    gameList.css        # 게임 목록 스타일
```

## 검증 방법

1. **MCP 도구 테스트**: Claude Desktop에서 `startCube`, `joinGame` 호출
2. **웹 API 테스트**: `curl` 또는 Postman으로 API 엔드포인트 확인
3. **UI 테스트**: 브라우저에서 `localhost:3000` 접속하여 기능 확인
4. **통합 테스트**: 웹에서 게임 생성 → 프롬프트 복사 → MCP로 게임 참여

## 우선순위

🔥 **즉시 시작**: `src/app.ts`, `src/types.ts` (MCP 도구 핵심 기능)  
⚡ **다음 단계**: `src/visualization/APIRoutes.ts` (웹 API)  
🎨 **마지막**: 프론트엔드 UI (HTML/CSS/JS)

---

**이 계획으로 진행하면 약 2-3시간 내에 완성 가능할 것으로 예상됩니다.**

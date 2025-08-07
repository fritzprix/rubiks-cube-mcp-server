import express from 'express';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';
import { CubeState, GameSession } from '../types.js';
import { WebSocketHandler } from './WebSocketHandler.js';
import { APIRoutes } from './APIRoutes.js';

export class VisualizationServer {
  private app: express.Application;
  private server: any;
  private webSocketHandler: WebSocketHandler;
  private apiRoutes: APIRoutes;
  private sessions: Map<string, GameSession>;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.sessions = new Map();
    
    this.setupTemplateEngine();
    this.webSocketHandler = new WebSocketHandler(this.server, this.sessions);
    this.apiRoutes = new APIRoutes(this.sessions);
    this.setupRoutes();
  }

  private setupTemplateEngine(): void {
    // EJS 템플릿 엔진 설정
    this.app.set('view engine', 'ejs');
    
    // 패키지 루트 디렉토리 찾기
    const packageRoot = this.findPackageRoot();
    this.app.set('views', path.join(packageRoot, 'views'));
    
    // 정적 파일 서빙
    this.app.use(express.static(path.join(packageRoot, 'public')));
    this.app.use(express.json());
  }

  private findPackageRoot(): string {
    // 현재 실행 파일의 위치에서 package.json이 있는 디렉토리를 찾음
    let currentDir = __dirname;
    
    while (currentDir !== path.dirname(currentDir)) {
      try {
        const packageJsonPath = path.join(currentDir, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = require(packageJsonPath);
          if (packageJson.name === 'rubiks-cube-mcp-server') {
            return currentDir;
          }
        }
      } catch (e) {
        // continue searching
      }
      currentDir = path.dirname(currentDir);
    }
    
    // 기본값: 현재 디렉토리에서 2레벨 위
    return path.join(__dirname, '../..');
  }

  private setupRoutes(): void {
    // API 라우트
    this.app.use('/api', this.apiRoutes.getRouter());
    
    // 메인 페이지
    this.app.get('/', (req, res) => {
      const games = Array.from(this.sessions.entries()).map(([id, session]) => ({
        id,
        title: `Game ${id.split('_')[1]}`,
        status: session.status,
        moveCount: session.cubeState.moveHistory.length,
        createdAt: new Date(session.createdAt).toLocaleString(),
        statusIcon: session.status === 'completed' ? '🎉' : '🎲',
        statusText: session.status === 'completed' ? 'SOLVED' : 'Active'
      }));
      
      res.render('gameList', { games });
    });
    
    // 게임 페이지
    this.app.get('/game/:gameId', (req, res) => {
      const { gameId } = req.params;
      const session = this.sessions.get(gameId);
      
      if (!session) {
        return res.status(404).send(`
          <html>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h1>Game Not Found</h1>
              <p>Game session "${gameId}" not found.</p>
              <a href="/">← Back to Games</a>
            </body>
          </html>
        `);
      }
      
      res.render('gameView', { 
        gameId,
        session,
        cubeState: session.cubeState 
      });
    });
  }

  // 세션 등록
  registerSession(session: GameSession): void {
    this.sessions.set(session.id, session);
  }

  // 세션 업데이트
  updateSession(gameId: string, cubeState: CubeState): void {
    const session = this.sessions.get(gameId);
    if (session) {
      session.cubeState = cubeState;
      session.lastActivity = Date.now();
      if (cubeState.solved) {
        session.status = 'completed';
      }
      
      this.webSocketHandler.broadcastGameState(gameId, cubeState, session.status);
    }
  }

  // 서버 시작
  start(port: number = 3000): void {
    this.server.listen(port, () => {
      console.error(`🎲 3D Cube visualization server running on http://localhost:${port}`);
      console.error(`🌐 WebSocket enabled for real-time updates`);
    });
  }

  // 서버 종료
  stop(): void {
    if (this.server) {
      this.server.close(() => {
        console.error("✅ Visualization server closed");
      });
      
      this.webSocketHandler.close();
    }
  }
}

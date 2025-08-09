import express from 'express';
import { GameSession, CubeMove } from '../types.js';
import { RubiksCube } from '../cubeLogic.js';

export class APIRoutes {
  private router: express.Router;
  private sessions: Map<string, GameSession>;
  private webSocketHandler: any;

  constructor(sessions: Map<string, GameSession>, webSocketHandler?: any) {
    this.router = express.Router();
    this.sessions = sessions;
    this.webSocketHandler = webSocketHandler;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // 큐브 상태 조회
    this.router.get('/cube/:gameId', (req, res) => {
      const { gameId } = req.params;
      const session = this.sessions.get(gameId);
      
      if (!session) {
        return res.status(404).json({ error: 'Game session not found' });
      }

      session.lastActivity = Date.now();
      res.json({
        gameId,
        state: session.cubeState,
        status: session.status
      });
    });

    // 큐브 상태 업데이트
    this.router.post('/cube/:gameId/move', (req, res) => {
      const { gameId } = req.params;
      const { move } = req.body;
      
      const session = this.sessions.get(gameId);
      if (!session) {
        return res.status(404).json({ error: 'Game session not found' });
      }

      try {
        // 유효한 move인지 확인
        const validMoves = ['U', 'D', 'L', 'R', 'F', 'B', 'U\'', 'D\'', 'L\'', 'R\'', 'F\'', 'B\'', 'U2', 'D2', 'L2', 'R2', 'F2', 'B2'];
        if (!validMoves.includes(move)) {
          return res.status(400).json({ error: 'Invalid move' });
        }

        // 큐브 인스턴스 생성 및 현재 상태로 설정
        const cube = new RubiksCube();
        cube.setState(session.cubeState);
        
        // move 실행
        cube.executeMove(move as CubeMove);
        
        // 세션 상태 업데이트
        session.cubeState = cube.getState();
        session.lastActivity = Date.now();
        
        // 큐브가 해결되었는지 확인
        if (cube.isSolved()) {
          session.status = 'completed';
        }

        // WebSocket으로 상태 브로드캐스트
        if (this.webSocketHandler) {
          this.webSocketHandler.broadcastGameState(gameId, session.cubeState, session.status);
        }

        res.json({
          success: true,
          message: `Move ${move} executed`,
          state: session.cubeState,
          status: session.status
        });
      } catch (error) {
        console.error('Error executing move:', error);
        res.status(500).json({ error: 'Failed to execute move' });
      }
    });
  }

  getRouter(): express.Router {
    return this.router;
  }
}

import express from 'express';
import { GameSession } from '../types.js';

export class APIRoutes {
  private router: express.Router;
  private sessions: Map<string, GameSession>;

  constructor(sessions: Map<string, GameSession>) {
    this.router = express.Router();
    this.sessions = sessions;
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

      session.lastActivity = Date.now();
      
      res.json({
        success: true,
        message: `Move ${move} recorded`
      });
    });
  }

  getRouter(): express.Router {
    return this.router;
  }
}

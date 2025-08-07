import { CubeState, GameSession } from '../types.js';

export class WebSocketHandler {
  private io: any;
  private sessions: Map<string, GameSession>;

  constructor(server: any, sessions: Map<string, GameSession>) {
    this.io = new (require('socket.io').Server)(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    this.sessions = sessions;
    this.setupWebSocket();
  }

  private setupWebSocket(): void {
    this.io.on('connection', (socket: any) => {
      console.error('Client connected:', socket.id);
      
      socket.on('joinGame', (gameId: string) => {
        socket.join(gameId);
        console.error(`Client ${socket.id} joined game ${gameId}`);
        
        const session = this.sessions.get(gameId);
        if (session) {
          socket.emit('gameState', {
            gameId,
            state: session.cubeState,
            status: session.status
          });
        }
      });
      
      socket.on('disconnect', () => {
        console.error('Client disconnected:', socket.id);
      });
    });
  }

  broadcastGameState(gameId: string, cubeState: CubeState, status: string): void {
    this.io.to(gameId).emit('gameState', {
      gameId,
      state: cubeState,
      status
    });
  }

  close(): void {
    if (this.io) {
      this.io.close();
    }
  }
}

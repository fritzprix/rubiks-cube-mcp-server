#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { RubiksCube } from './cubeLogic.js';
import { VisualizationServer } from './visualizationServer.js';
import { GameSession, CubeMove, CubeResponse } from './types.js';

class RubiksCubeMCPServer {
  private mcpServer: McpServer;
  private visualizationServer: VisualizationServer;
  private games: Map<string, { cube: RubiksCube; session: GameSession }>;

  constructor() {
    this.mcpServer = new McpServer({
      name: "rubiks-cube-mcp-server",
      version: "1.0.0"
    });
    this.visualizationServer = new VisualizationServer();
    this.games = new Map();
    this.setupTools();
  }

  private setupTools(): void {
    // 큐브 게임 시작
    this.mcpServer.tool(
      "startCube",
      "Initialize a new Rubik's Cube game session",
      {
        scramble: z.boolean().optional().describe("Whether to scramble the cube initially")
      },
      async ({ scramble = true }: { scramble?: boolean }) => {
        const gameId = `cube_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const cube = new RubiksCube();
        
        if (scramble) {
          cube.scramble();
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
          nextAction: currentState.solved ? "finish" : "manipulateCube"
        };
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }
    );

    // 큐브 조작
    this.mcpServer.tool(
      "manipulateCube",
      "Execute a move on the Rubik's Cube",
      {
        gameId: z.string().describe("The game session ID"),
        move: z.enum(['U', 'D', 'L', 'R', 'F', 'B', 'U\'', 'D\'', 'L\'', 'R\'', 'F\'', 'B\'', 'U2', 'D2', 'L2', 'R2', 'F2', 'B2']).describe("The cube move to execute")
      },
      async ({ gameId, move }: { gameId: string; move: string }) => {
        const game = this.games.get(gameId);
        if (!game) {
          throw new Error(`Game session ${gameId} not found`);
        }

        const { cube, session } = game;
        
        // 이미 해결된 큐브인지 확인
        if (session.status === 'completed') {
          const response: CubeResponse = {
            gameId,
            cube: cube.getState(),
            nextAction: "finish"
          };
          
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2)
              }
            ]
          };
        }

        // 움직임 실행
        cube.executeMove(move as CubeMove);
        const newState = cube.getState();
        
        // 세션 업데이트
        session.cubeState = newState;
        session.lastActivity = Date.now();
        if (newState.solved) {
          session.status = 'completed';
        }
        
        // 시각화 서버 업데이트
        this.visualizationServer.updateSession(gameId, newState);
        
        const response: CubeResponse = {
          gameId,
          cube: newState,
          nextAction: newState.solved ? "finish" : "manipulateCube"
        };
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }
    );

    // 게임 완료
    this.mcpServer.tool(
      "finish",
      "Complete the Rubik's Cube game session",
      {
        gameId: z.string().describe("The game session ID")
      },
      async ({ gameId }: { gameId: string }) => {
        const game = this.games.get(gameId);
        if (!game) {
          throw new Error(`Game session ${gameId} not found`);
        }

        const { cube, session } = game;
        const finalState = cube.getState();
        
        session.status = 'completed';
        session.lastActivity = Date.now();
        
        const response: CubeResponse = {
          gameId,
          cube: finalState,
          nextAction: null
        };
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }
    );
  }

  async start(): Promise<void> {
    // 시각화 서버 시작 - 환경변수 PORT 또는 기본값 3000 사용
    const port = parseInt(process.env.PORT || '3000');
    this.visualizationServer.start(port);
    
    // MCP 서버 시작
    const transport = new StdioServerTransport();
    
    // Process exit handlers - parent process가 죽으면 함께 종료
    process.on('SIGINT', () => {
      console.error("🛑 SIGINT received, shutting down...");
      this.shutdown();
    });
    
    process.on('SIGTERM', () => {
      console.error("🛑 SIGTERM received, shutting down...");
      this.shutdown();
    });
    
    // Stdio disconnect handler - MCP client 연결이 끊어지면 종료
    process.stdin.on('end', () => {
      console.error("🛑 Stdin disconnected, shutting down...");
      this.shutdown();
    });
    
    process.stdin.on('close', () => {
      console.error("🛑 Stdin closed, shutting down...");
      this.shutdown();
    });
    
    await this.mcpServer.connect(transport);
    
    console.error("🎲 Rubik's Cube MCP Server started!");
    console.error("🌐 Visualization available at: http://localhost:3000");
  }
  
  private shutdown(): void {
    console.error("🔄 Shutting down servers...");
    
    try {
      // Visualization server 종료
      this.visualizationServer.stop();
      console.error("✅ Visualization server stopped");
    } catch (error) {
      console.error("❌ Error stopping visualization server:", error);
    }
    
    // Process 종료
    process.exit(0);
  }
}

// 서버 시작
const server = new RubiksCubeMCPServer();
server.start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

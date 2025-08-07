#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { RubiksCube } from './cubeLogic.js';
import { VisualizationServer } from './visualizationServer.js';
import { GameSession, CubeMove } from './types.js';

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
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                cube: currentState,
                nextAction: currentState.solved ? "finish" : "manipulateCube"
              }, null, 2)
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
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  cube: cube.getState(),
                  nextAction: "finish"
                }, null, 2)
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
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                cube: newState,
                nextAction: newState.solved ? "finish" : "manipulateCube"
              }, null, 2)
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
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                cube: finalState,
                nextAction: null
              }, null, 2)
            }
          ]
        };
      }
    );
  }

  async start(): Promise<void> {
    // 시각화 서버 시작
    this.visualizationServer.start(3000);
    
    // MCP 서버 시작
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);
    
    console.error("🎲 Rubik's Cube MCP Server started!");
    console.error("🌐 Visualization available at: http://localhost:3000");
  }
}

// 서버 시작
const server = new RubiksCubeMCPServer();
server.start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

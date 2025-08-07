// Cube state representation
export interface CubeState {
  faces: {
    front: string[][];   // 3x3 grid: ["R", "G", "B", ...]
    back: string[][];
    left: string[][];
    right: string[][];
    top: string[][];
    bottom: string[][];
  };
  solved: boolean;
  moveHistory: string[];
}

// 큐브 조작 명령
export type CubeMove = 'U' | 'D' | 'L' | 'R' | 'F' | 'B' | 
                'U\'' | 'D\'' | 'L\'' | 'R\'' | 'F\'' | 'B\'' |
                'U2' | 'D2' | 'L2' | 'R2' | 'F2' | 'B2';

// 게임 세션 관리
export interface GameSession {
  id: string;
  cubeState: CubeState;
  createdAt: number;
  lastActivity: number;
  status: 'active' | 'completed';
}

// Colors for cube faces
export const COLORS = {
  WHITE: 'W',
  YELLOW: 'Y', 
  RED: 'R',
  ORANGE: 'O',
  BLUE: 'B',
  GREEN: 'G'
} as const;

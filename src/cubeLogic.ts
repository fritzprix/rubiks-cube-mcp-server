import { CubeState, CubeMove, COLORS } from './types.js';

export class RubiksCube {
  private state: CubeState;

  constructor() {
    this.state = this.createSolvedCube();
  }

  // 해결된 큐브 상태 생성
  private createSolvedCube(): CubeState {
    const { WHITE, YELLOW, RED, ORANGE, BLUE, GREEN } = COLORS;
    
    return {
      faces: {
        front: [
          [GREEN, GREEN, GREEN],
          [GREEN, GREEN, GREEN],
          [GREEN, GREEN, GREEN]
        ],
        back: [
          [BLUE, BLUE, BLUE],
          [BLUE, BLUE, BLUE],
          [BLUE, BLUE, BLUE]
        ],
        left: [
          [ORANGE, ORANGE, ORANGE],
          [ORANGE, ORANGE, ORANGE],
          [ORANGE, ORANGE, ORANGE]
        ],
        right: [
          [RED, RED, RED],
          [RED, RED, RED],
          [RED, RED, RED]
        ],
        top: [
          [WHITE, WHITE, WHITE],
          [WHITE, WHITE, WHITE],
          [WHITE, WHITE, WHITE]
        ],
        bottom: [
          [YELLOW, YELLOW, YELLOW],
          [YELLOW, YELLOW, YELLOW],
          [YELLOW, YELLOW, YELLOW]
        ]
      },
      solved: true,
      moveHistory: []
    };
  }

  // 큐브 상태 반환
  getState(): CubeState {
    return JSON.parse(JSON.stringify(this.state)); // Deep copy
  }

  // 큐브 상태 설정
  setState(newState: CubeState): void {
    this.state = JSON.parse(JSON.stringify(newState)); // Deep copy
  }

  // 큐브가 해결되었는지 확인 (public으로 변경)
  isSolved(): boolean {
    for (const face of Object.values(this.state.faces)) {
      const firstColor = face[0][0];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (face[i][j] !== firstColor) {
            return false;
          }
        }
      }
    }
    return true;
  }

  // 큐브가 해결되었는지 확인 (private - 내부용)
  private checkSolved(): boolean {
    return this.isSolved();
  }

  // 면을 시계방향으로 90도 회전
  private rotateFace(face: string[][]): string[][] {
    const n = face.length;
    const rotated = Array(n).fill(null).map(() => Array(n).fill(''));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        rotated[j][n - 1 - i] = face[i][j];
      }
    }
    
    return rotated;
  }

  // 면을 반시계방향으로 90도 회전
  private rotateFaceCounterClockwise(face: string[][]): string[][] {
    return this.rotateFace(this.rotateFace(this.rotateFace(face)));
  }

  // U (Up) 회전 구현
  private moveU(): void {
    // Top face 시계방향 회전
    this.state.faces.top = this.rotateFace(this.state.faces.top);
    
    // 인접 면들의 상단 행 회전
    const temp = [...this.state.faces.front[0]];
    this.state.faces.front[0] = [...this.state.faces.right[0]];
    this.state.faces.right[0] = [...this.state.faces.back[0]];
    this.state.faces.back[0] = [...this.state.faces.left[0]];
    this.state.faces.left[0] = [...temp];
  }

  // D (Down) 회전 구현
  private moveD(): void {
    // Bottom face 시계방향 회전
    this.state.faces.bottom = this.rotateFace(this.state.faces.bottom);
    
    // 인접 면들의 하단 행 회전 (반대 방향)
    const temp = [...this.state.faces.front[2]];
    this.state.faces.front[2] = [...this.state.faces.left[2]];
    this.state.faces.left[2] = [...this.state.faces.back[2]];
    this.state.faces.back[2] = [...this.state.faces.right[2]];
    this.state.faces.right[2] = [...temp];
  }

  // R (Right) 회전 구현
  private moveR(): void {
    // Right face 시계방향 회전
    this.state.faces.right = this.rotateFace(this.state.faces.right);
    
    // 인접 면들의 우측 열 회전
    const temp = [this.state.faces.front[0][2], this.state.faces.front[1][2], this.state.faces.front[2][2]];
    this.state.faces.front[0][2] = this.state.faces.bottom[0][2];
    this.state.faces.front[1][2] = this.state.faces.bottom[1][2];
    this.state.faces.front[2][2] = this.state.faces.bottom[2][2];
    
    this.state.faces.bottom[0][2] = this.state.faces.back[2][0];
    this.state.faces.bottom[1][2] = this.state.faces.back[1][0];
    this.state.faces.bottom[2][2] = this.state.faces.back[0][0];
    
    this.state.faces.back[0][0] = this.state.faces.top[2][2];
    this.state.faces.back[1][0] = this.state.faces.top[1][2];
    this.state.faces.back[2][0] = this.state.faces.top[0][2];
    
    this.state.faces.top[0][2] = temp[0];
    this.state.faces.top[1][2] = temp[1];
    this.state.faces.top[2][2] = temp[2];
  }

  // L (Left) 회전 구현
  private moveL(): void {
    // Left face 시계방향 회전
    this.state.faces.left = this.rotateFace(this.state.faces.left);
    
    // 인접 면들의 좌측 열 회전
    const temp = [this.state.faces.front[0][0], this.state.faces.front[1][0], this.state.faces.front[2][0]];
    this.state.faces.front[0][0] = this.state.faces.top[0][0];
    this.state.faces.front[1][0] = this.state.faces.top[1][0];
    this.state.faces.front[2][0] = this.state.faces.top[2][0];
    
    this.state.faces.top[0][0] = this.state.faces.back[2][2];
    this.state.faces.top[1][0] = this.state.faces.back[1][2];
    this.state.faces.top[2][0] = this.state.faces.back[0][2];
    
    this.state.faces.back[0][2] = this.state.faces.bottom[2][0];
    this.state.faces.back[1][2] = this.state.faces.bottom[1][0];
    this.state.faces.back[2][2] = this.state.faces.bottom[0][0];
    
    this.state.faces.bottom[0][0] = temp[0];
    this.state.faces.bottom[1][0] = temp[1];
    this.state.faces.bottom[2][0] = temp[2];
  }

  // F (Front) 회전 구현
  private moveF(): void {
    // Front face 시계방향 회전
    this.state.faces.front = this.rotateFace(this.state.faces.front);
    
    // 인접 면들 회전
    const temp = [...this.state.faces.top[2]];
    this.state.faces.top[2] = [this.state.faces.left[2][2], this.state.faces.left[1][2], this.state.faces.left[0][2]];
    this.state.faces.left[0][2] = this.state.faces.bottom[0][0];
    this.state.faces.left[1][2] = this.state.faces.bottom[0][1];
    this.state.faces.left[2][2] = this.state.faces.bottom[0][2];
    this.state.faces.bottom[0] = [this.state.faces.right[2][0], this.state.faces.right[1][0], this.state.faces.right[0][0]];
    this.state.faces.right[0][0] = temp[0];
    this.state.faces.right[1][0] = temp[1];
    this.state.faces.right[2][0] = temp[2];
  }

  // B (Back) 회전 구현
  private moveB(): void {
    // Back face 시계방향 회전
    this.state.faces.back = this.rotateFace(this.state.faces.back);
    
    // 인접 면들 회전
    const temp = [...this.state.faces.top[0]];
    this.state.faces.top[0] = [this.state.faces.right[0][2], this.state.faces.right[1][2], this.state.faces.right[2][2]];
    this.state.faces.right[0][2] = this.state.faces.bottom[2][2];
    this.state.faces.right[1][2] = this.state.faces.bottom[2][1];
    this.state.faces.right[2][2] = this.state.faces.bottom[2][0];
    this.state.faces.bottom[2] = [this.state.faces.left[2][0], this.state.faces.left[1][0], this.state.faces.left[0][0]];
    this.state.faces.left[0][0] = temp[2];
    this.state.faces.left[1][0] = temp[1];
    this.state.faces.left[2][0] = temp[0];
  }

  // 움직임 실행
  executeMove(move: CubeMove): void {
    const moveFunc = this.getMoveFunction(move);
    moveFunc();
    
    this.state.moveHistory.push(move);
    this.state.solved = this.checkSolved();
  }

  // 움직임에 따른 함수 반환
  private getMoveFunction(move: CubeMove): () => void {
    switch (move) {
      case 'U': return () => this.moveU();
      case 'U\'': return () => { this.moveU(); this.moveU(); this.moveU(); };
      case 'U2': return () => { this.moveU(); this.moveU(); };
      case 'D': return () => this.moveD();
      case 'D\'': return () => { this.moveD(); this.moveD(); this.moveD(); };
      case 'D2': return () => { this.moveD(); this.moveD(); };
      case 'R': return () => this.moveR();
      case 'R\'': return () => { this.moveR(); this.moveR(); this.moveR(); };
      case 'R2': return () => { this.moveR(); this.moveR(); };
      case 'L': return () => this.moveL();
      case 'L\'': return () => { this.moveL(); this.moveL(); this.moveL(); };
      case 'L2': return () => { this.moveL(); this.moveL(); };
      case 'F': return () => this.moveF();
      case 'F\'': return () => { this.moveF(); this.moveF(); this.moveF(); };
      case 'F2': return () => { this.moveF(); this.moveF(); };
      case 'B': return () => this.moveB();
      case 'B\'': return () => { this.moveB(); this.moveB(); this.moveB(); };
      case 'B2': return () => { this.moveB(); this.moveB(); };
      default: throw new Error(`Unknown move: ${move}`);
    }
  }

  // 큐브 상태를 텍스트로 표현
  getStateAsText(): string {
    const { faces } = this.state;
    let result = '';
    
    result += '    ' + faces.top.map(row => row.join(' ')).join('\n    ') + '\n';
    result += '\n';
    
    for (let i = 0; i < 3; i++) {
      result += faces.left[i].join(' ') + ' | ';
      result += faces.front[i].join(' ') + ' | ';
      result += faces.right[i].join(' ') + ' | ';
      result += faces.back[i].join(' ') + '\n';
    }
    
    result += '\n';
    result += '    ' + faces.bottom.map(row => row.join(' ')).join('\n    ') + '\n';
    
    return result;
  }

  // 큐브 섞기 (테스트용)
  scramble(moves: number = 20): void {
    const allMoves: CubeMove[] = ['U', 'D', 'L', 'R', 'F', 'B', 'U\'', 'D\'', 'L\'', 'R\'', 'F\'', 'B\''];
    
    for (let i = 0; i < moves; i++) {
      const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];
      this.executeMove(randomMove);
    }
  }
}

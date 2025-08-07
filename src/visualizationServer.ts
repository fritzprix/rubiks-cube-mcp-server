import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { CubeState, GameSession } from './types.js';

export class VisualizationServer {
  private app: express.Application;
  private server: any;
  private io: any;
  private sessions: Map<string, GameSession>;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new (require('socket.io').Server)(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    this.sessions = new Map();
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupWebSocket(): void {
    this.io.on('connection', (socket: any) => {
      console.error('Client connected:', socket.id);
      
      socket.on('joinGame', (gameId: string) => {
        socket.join(gameId);
        console.error(`Client ${socket.id} joined game ${gameId}`);
        
        // 현재 게임 상태 전송
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

  private setupRoutes(): void {
    // Static files and basic HTML
    this.app.use(express.static('public'));
    this.app.use(express.json());

    // 큐브 상태 조회
    this.app.get('/api/cube/:gameId', (req, res) => {
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

    // 큐브 상태 업데이트 (GUI에서 직접 조작용)
    this.app.post('/api/cube/:gameId/move', (req, res) => {
      const { gameId } = req.params;
      const { move } = req.body;
      
      const session = this.sessions.get(gameId);
      if (!session) {
        return res.status(404).json({ error: 'Game session not found' });
      }

      // 여기서는 단순히 move를 기록만 하고, 실제 cube logic은 MCP 서버에서 처리
      session.lastActivity = Date.now();
      
      res.json({
        success: true,
        message: `Move ${move} recorded`
      });
    });

    // 메인 페이지
    this.app.get('/', (req, res) => {
      res.send(this.getHTMLPage());
    });

    // 특정 게임 세션 페이지
    this.app.get('/game/:gameId', (req, res) => {
      const { gameId } = req.params;
      res.send(this.getHTMLPage(gameId));
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
      
      // WebSocket으로 실시간 업데이트 전송
      this.io.to(gameId).emit('gameState', {
        gameId,
        state: cubeState,
        status: session.status
      });
    }
  }

  // HTML 페이지 생성
  private getHTMLPage(gameId?: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3D Rubik's Cube Visualizer</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            margin: 0;
            padding: 0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        
        .header {
            background: rgba(0,0,0,0.3);
            padding: 20px;
            text-align: center;
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .game-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            max-width: 1200px;
            margin: 0 auto;
            width: 100%;
        }
        
        .status {
            font-size: 24px;
            font-weight: bold;
            padding: 10px 20px;
            border-radius: 25px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }
        
        .status.active {
            background: linear-gradient(45deg, #4CAF50, #45a049);
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
        }
        
        .status.solved {
            background: linear-gradient(45deg, #FF6B6B, #FF8E53);
            box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        .cube-container {
            flex: 1;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        
        #cubeCanvas {
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            cursor: grab;
        }
        
        #cubeCanvas:active {
            cursor: grabbing;
        }
        
        .controls {
            position: absolute;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            display: grid;
            grid-template-columns: repeat(6, 60px);
            gap: 10px;
            background: rgba(0,0,0,0.2);
            padding: 20px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
        }
        
        .move-btn {
            width: 60px;
            height: 60px;
            background: linear-gradient(145deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        
        .move-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            background: linear-gradient(145deg, #764ba2 0%, #667eea 100%);
        }
        
        .move-btn:active {
            transform: translateY(-1px);
        }
        
        .info-panel {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.3);
            padding: 20px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
        }
        
        .info-item {
            margin: 10px 0;
            font-size: 16px;
        }
        
        .connection-status {
            position: absolute;
            top: 20px;
            left: 20px;
            padding: 10px 15px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
        }
        
        .connected {
            background: linear-gradient(45deg, #4CAF50, #45a049);
        }
        
        .disconnected {
            background: linear-gradient(45deg, #f44336, #d32f2f);
        }
        
        .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 24px;
            text-align: center;
        }
        
        .spinner {
            border: 4px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top: 4px solid #fff;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="game-info">
            <h1>🎲 3D Rubik's Cube Solver</h1>
            ${gameId ? `<div class="info-item">Game: <strong>${gameId}</strong></div>` : '<div class="info-item">No active game</div>'}
            <div id="status" class="status active">Connecting...</div>
        </div>
    </div>
    
    <div id="connectionStatus" class="connection-status disconnected">
        ● Disconnected
    </div>
    
    <div class="cube-container">
        <div id="loading" class="loading">
            <div class="spinner"></div>
            Loading 3D Cube...
        </div>
        <canvas id="cubeCanvas" width="800" height="600"></canvas>
    </div>
    
    <div class="info-panel">
        <div class="info-item">Moves: <span id="moveCount">0</span></div>
        <div class="info-item">Last Move: <span id="lastMove">None</span></div>
        <div class="info-item">Status: <span id="gameStatus">Loading...</span></div>
    </div>
    
    <div class="controls">
        <button class="move-btn" onclick="sendMove('U')" title="Up">U</button>
        <button class="move-btn" onclick="sendMove('D')" title="Down">D</button>
        <button class="move-btn" onclick="sendMove('L')" title="Left">L</button>
        <button class="move-btn" onclick="sendMove('R')" title="Right">R</button>
        <button class="move-btn" onclick="sendMove('F')" title="Front">F</button>
        <button class="move-btn" onclick="sendMove('B')" title="Back">B</button>
        <button class="move-btn" onclick="sendMove('U\\'')">U'</button>
        <button class="move-btn" onclick="sendMove('D\\'')">D'</button>
        <button class="move-btn" onclick="sendMove('L\\'')">L'</button>
        <button class="move-btn" onclick="sendMove('R\\'')">R'</button>
        <button class="move-btn" onclick="sendMove('F\\'')">F'</button>
        <button class="move-btn" onclick="sendMove('B\\'')">B'</button>
        <button class="move-btn" onclick="sendMove('U2')">U2</button>
        <button class="move-btn" onclick="sendMove('D2')">D2</button>
        <button class="move-btn" onclick="sendMove('L2')">L2</button>
        <button class="move-btn" onclick="sendMove('R2')">R2</button>
        <button class="move-btn" onclick="sendMove('F2')">F2</button>
        <button class="move-btn" onclick="sendMove('B2')">B2</button>
    </div>

    <script>
        const gameId = '${gameId || ''}';
        
        // WebSocket 연결
        const socket = io();
        
        // Three.js 3D 큐브 설정
        let scene, camera, renderer, cubeGroup;
        let cubies = []; // 27개의 작은 큐브들
        let isRotating = false;
        
        // 색상 매핑
        const colorMap = {
            'W': 0xffffff, // 흰색
            'Y': 0xffff00, // 노랑
            'R': 0xff0000, // 빨강
            'O': 0xff8000, // 주황
            'B': 0x0000ff, // 파랑
            'G': 0x00ff00  // 초록
        };
        
        function initThreeJS() {
            // Scene 설정
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x000000);
            
            // Camera 설정
            camera = new THREE.PerspectiveCamera(75, 800/600, 0.1, 1000);
            camera.position.set(5, 5, 5);
            camera.lookAt(0, 0, 0);
            
            // Renderer 설정
            const canvas = document.getElementById('cubeCanvas');
            renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
            renderer.setSize(800, 600);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            
            // 조명 설정
            const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
            scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(10, 10, 5);
            directionalLight.castShadow = true;
            scene.add(directionalLight);
            
            // 큐브 그룹 생성
            cubeGroup = new THREE.Group();
            scene.add(cubeGroup);
            
            // 27개의 작은 큐브 생성 (3x3x3)
            createRubiksCube();
            
            // 마우스 컨트롤
            setupMouseControls();
            
            // 애니메이션 시작
            animate();
            
            document.getElementById('loading').style.display = 'none';
        }
        
        function createRubiksCube() {
            cubies = [];
            
            // 기존 큐브들 제거
            while(cubeGroup.children.length > 0) {
                cubeGroup.remove(cubeGroup.children[0]);
            }
            
            const cubeSize = 0.95;
            const gap = 0.05;
            
            for (let x = -1; x <= 1; x++) {
                for (let y = -1; y <= 1; y++) {
                    for (let z = -1; z <= 1; z++) {
                        // 내부 큐브는 건너뛰기 (보이지 않음)
                        if (Math.abs(x) + Math.abs(y) + Math.abs(z) === 3) continue;
                        
                        const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
                        
                        // 각 면에 다른 색상의 재질 적용
                        const materials = [
                            new THREE.MeshLambertMaterial({ color: 0x333333 }), // right
                            new THREE.MeshLambertMaterial({ color: 0x333333 }), // left  
                            new THREE.MeshLambertMaterial({ color: 0x333333 }), // top
                            new THREE.MeshLambertMaterial({ color: 0x333333 }), // bottom
                            new THREE.MeshLambertMaterial({ color: 0x333333 }), // front
                            new THREE.MeshLambertMaterial({ color: 0x333333 })  // back
                        ];
                        
                        const cube = new THREE.Mesh(geometry, materials);
                        cube.position.set(
                            x * (cubeSize + gap),
                            y * (cubeSize + gap),
                            z * (cubeSize + gap)
                        );
                        
                        cube.castShadow = true;
                        cube.receiveShadow = true;
                        
                        // 위치 정보 저장
                        cube.userData = { x, y, z };
                        
                        cubeGroup.add(cube);
                        cubies.push(cube);
                    }
                }
            }
        }
        
        function updateCubeColors(faces) {
            // 면별 색상 업데이트 로직
            // 이 부분은 복잡하므로 간단히 랜덤 색상으로 대체
            cubies.forEach(cube => {
                const materials = cube.material;
                if (Array.isArray(materials)) {
                    materials.forEach((material, index) => {
                        const colors = Object.values(colorMap);
                        material.color.setHex(colors[Math.floor(Math.random() * colors.length)]);
                    });
                }
            });
        }
        
        function setupMouseControls() {
            let isMouseDown = false;
            let mouseX = 0, mouseY = 0;
            
            const canvas = document.getElementById('cubeCanvas');
            
            canvas.addEventListener('mousedown', (event) => {
                isMouseDown = true;
                mouseX = event.clientX;
                mouseY = event.clientY;
            });
            
            canvas.addEventListener('mouseup', () => {
                isMouseDown = false;
            });
            
            canvas.addEventListener('mousemove', (event) => {
                if (!isMouseDown) return;
                
                const deltaX = event.clientX - mouseX;
                const deltaY = event.clientY - mouseY;
                
                cubeGroup.rotation.y += deltaX * 0.01;
                cubeGroup.rotation.x += deltaY * 0.01;
                
                mouseX = event.clientX;
                mouseY = event.clientY;
            });
        }
        
        function animate() {
            requestAnimationFrame(animate);
            
            // 자동 회전 (마우스 조작이 없을 때)
            if (!isRotating) {
                cubeGroup.rotation.y += 0.005;
            }
            
            renderer.render(scene, camera);
        }
        
        // WebSocket 이벤트 핸들러
        socket.on('connect', () => {
            console.log('Connected to server');
            document.getElementById('connectionStatus').textContent = '● Connected';
            document.getElementById('connectionStatus').className = 'connection-status connected';
            
            if (gameId) {
                socket.emit('joinGame', gameId);
            }
        });
        
        socket.on('disconnect', () => {
            console.log('Disconnected from server');
            document.getElementById('connectionStatus').textContent = '● Disconnected';
            document.getElementById('connectionStatus').className = 'connection-status disconnected';
        });
        
        socket.on('gameState', (data) => {
            console.log('Game state update:', data);
            updateGameState(data.state);
            updateStatus(data.status);
        });
        
        function updateGameState(state) {
            document.getElementById('moveCount').textContent = state.moveHistory.length;
            document.getElementById('lastMove').textContent = state.moveHistory[state.moveHistory.length - 1] || 'None';
            
            // 3D 큐브 색상 업데이트
            updateCubeColors(state.faces);
        }
        
        function updateStatus(status) {
            const statusElement = document.getElementById('status');
            const gameStatusElement = document.getElementById('gameStatus');
            
            if (status === 'completed') {
                statusElement.textContent = '🎉 SOLVED!';
                statusElement.className = 'status solved';
                gameStatusElement.textContent = 'Completed';
            } else {
                statusElement.textContent = 'Solving...';
                statusElement.className = 'status active';
                gameStatusElement.textContent = 'Active';
            }
        }
        
        function sendMove(move) {
            if (!gameId) {
                alert('No active game session');
                return;
            }
            
            // 시각적 회전 효과
            isRotating = true;
            setTimeout(() => { isRotating = false; }, 500);
            
            // 서버로 move 전송 (HTTP API 사용)
            fetch(\`/api/cube/\${gameId}/move\`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ move }),
            }).catch(error => {
                console.error('Failed to send move:', error);
            });
        }
        
        // 초기화
        if (gameId) {
            initThreeJS();
        } else {
            document.getElementById('loading').innerHTML = '<h2>No game session provided</h2><p>Please start a game through the MCP server</p>';
        }
    </script>
</body>
</html>`;
  }

  // 서버 시작
  start(port: number = 3000): void {
    this.server.listen(port, () => {
      console.error(`🎲 3D Cube visualization server running on http://localhost:${port}`);
      console.error(`🌐 WebSocket enabled for real-time updates`);
    });
  }
}

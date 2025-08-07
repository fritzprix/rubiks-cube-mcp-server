import express from 'express';
import { createServer } from 'http';
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
    if (gameId) {
      return this.getGamePage(gameId);
    } else {
      return this.getGameListPage();
    }
  }

  // 게임 리스트 페이지
  private getGameListPage(): string {
    const gamesList = Array.from(this.sessions.entries()).map(([id, session]) => {
      const createdDate = new Date(session.createdAt).toLocaleString();
      const statusIcon = session.status === 'completed' ? '🎉' : '🎲';
      const statusText = session.status === 'completed' ? 'SOLVED' : 'Active';
      const moveCount = session.cubeState.moveHistory.length;
      
      return `
        <div class="game-card" onclick="window.location.href='/game/${id}'">
          <div class="game-header">
            <span class="game-icon">${statusIcon}</span>
            <div class="game-title">Game ${id.split('_')[1]}</div>
            <div class="game-status ${session.status}">${statusText}</div>
          </div>
          <div class="game-details">
            <div>Moves: ${moveCount}</div>
            <div>Created: ${createdDate}</div>
          </div>
        </div>
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rubik's Cube Games</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        
        .header h1 {
            font-size: 3rem;
            margin: 0;
            text-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }
        
        .header p {
            font-size: 1.2rem;
            opacity: 0.8;
            margin: 10px 0;
        }
        
        .games-container {
            max-width: 1200px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .game-card {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .game-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
            background: rgba(255, 255, 255, 0.15);
        }
        
        .game-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            gap: 10px;
        }
        
        .game-icon {
            font-size: 2rem;
        }
        
        .game-title {
            font-size: 1.4rem;
            font-weight: bold;
            flex: 1;
        }
        
        .game-status {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: bold;
        }
        
        .game-status.active {
            background: linear-gradient(45deg, #4CAF50, #45a049);
        }
        
        .game-status.completed {
            background: linear-gradient(45deg, #FF6B6B, #FF8E53);
        }
        
        .game-details {
            display: flex;
            justify-content: space-between;
            font-size: 0.9rem;
            opacity: 0.8;
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            opacity: 0.7;
        }
        
        .empty-state h2 {
            font-size: 2rem;
            margin-bottom: 20px;
        }
        
        .empty-state p {
            font-size: 1.1rem;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎲 Rubik's Cube Games</h1>
        <p>View and manage your cube solving sessions</p>
    </div>
    
    <div class="games-container">
        ${gamesList || `
            <div class="empty-state">
                <h2>No games yet</h2>
                <p>Start a new Rubik's Cube game using the MCP server<br>to see it appear here!</p>
            </div>
        `}
    </div>
    
    <script>
        // Auto-refresh every 5 seconds to show new games
        setInterval(() => {
            window.location.reload();
        }, 5000);
    </script>
</body>
</html>
    `;
  }

  // 개별 게임 페이지
  private getGamePage(gameId: string): string {
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
            <div>
                <a href="/" style="color: rgba(255,255,255,0.7); text-decoration: none; font-size: 0.9rem;">← Back to Games</a>
                <h1 style="margin: 5px 0;">🎲 3D Rubik's Cube Solver</h1>
            </div>
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
        
        function updateCubeColors(state) {
            if (!state || !state.faces) return;
            
            // 큐브 상태에 따라 각 작은 큐브의 면 색상을 업데이트
            const faces = state.faces;
            
            cubies.forEach(cube => {
                const { x, y, z } = cube.userData;
                const materials = cube.material;
                
                if (Array.isArray(materials)) {
                    // 각 면의 색상을 큐브 상태에 맞게 설정
                    
                    // Right face (x = 1)
                    if (x === 1) {
                        const faceIndex = getFaceIndex('right', y, z);
                        const row = Math.floor(faceIndex / 3);
                        const col = faceIndex % 3;
                        if (faces.right && faces.right[row] && faces.right[row][col]) {
                            materials[0].color.setHex(colorMap[faces.right[row][col]]);
                        }
                    }
                    
                    // Left face (x = -1)  
                    if (x === -1) {
                        const faceIndex = getFaceIndex('left', y, z);
                        const row = Math.floor(faceIndex / 3);
                        const col = faceIndex % 3;
                        if (faces.left && faces.left[row] && faces.left[row][col]) {
                            materials[1].color.setHex(colorMap[faces.left[row][col]]);
                        }
                    }
                    
                    // Top face (y = 1)
                    if (y === 1) {
                        const faceIndex = getFaceIndex('top', x, z);
                        const row = Math.floor(faceIndex / 3);
                        const col = faceIndex % 3;
                        if (faces.top && faces.top[row] && faces.top[row][col]) {
                            materials[2].color.setHex(colorMap[faces.top[row][col]]);
                        }
                    }
                    
                    // Bottom face (y = -1)
                    if (y === -1) {
                        const faceIndex = getFaceIndex('bottom', x, z);
                        const row = Math.floor(faceIndex / 3);
                        const col = faceIndex % 3;
                        if (faces.bottom && faces.bottom[row] && faces.bottom[row][col]) {
                            materials[3].color.setHex(colorMap[faces.bottom[row][col]]);
                        }
                    }
                    
                    // Front face (z = 1)
                    if (z === 1) {
                        const faceIndex = getFaceIndex('front', x, y);
                        const row = Math.floor(faceIndex / 3);
                        const col = faceIndex % 3;
                        if (faces.front && faces.front[row] && faces.front[row][col]) {
                            materials[4].color.setHex(colorMap[faces.front[row][col]]);
                        }
                    }
                    
                    // Back face (z = -1)
                    if (z === -1) {
                        const faceIndex = getFaceIndex('back', x, y);
                        const row = Math.floor(faceIndex / 3);
                        const col = faceIndex % 3;
                        if (faces.back && faces.back[row] && faces.back[row][col]) {
                            materials[5].color.setHex(colorMap[faces.back[row][col]]);
                        }
                    }
                }
            });
        }
        
        // 3D 좌표를 면 배열 인덱스로 변환
        function getFaceIndex(face, coord1, coord2) {
            // 3x3 격자에서 (-1,-1) = 0, (-1,0) = 1, (-1,1) = 2, (0,-1) = 3, ...
            const normalize = (val) => val + 1; // -1,0,1 -> 0,1,2
            
            switch(face) {
                case 'top': // Top face (y=1): x,z 좌표 사용
                case 'bottom': // Bottom face (y=-1): x,z 좌표 사용
                    return normalize(coord2) * 3 + normalize(coord1); // z*3 + x
                    
                case 'front': // Front face (z=1): x,y 좌표 사용
                case 'back': // Back face (z=-1): x,y 좌표 사용
                    return normalize(-coord2) * 3 + normalize(coord1); // -y*3 + x (y축 뒤집기)
                    
                case 'right': // Right face (x=1): y,z 좌표 사용
                case 'left': // Left face (x=-1): y,z 좌표 사용
                    return normalize(-coord1) * 3 + normalize(coord2); // -y*3 + z (y축 뒤집기)
                    
                default:
                    return 0;
            }
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
            
            // 3D 큐브 색상 업데이트 (실제 상태 반영)
            updateCubeColors(state);
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

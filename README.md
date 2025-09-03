# Rubik's Cube MCP Server

A Model Context Protocol (MCP) server that provides AI agents with the ability to solve Rubi### 4. `finish`

Complete the Rubik's Cube game session.

**Parameters:**

- `gameId` (string): The game session ID

**Returns:**

- Final game statistics
- Move history
- Completion status with congratulations messageles through systematic manipulation and real-time visualization.

<a href="https://glama.ai/mcp/servers/@fritzprix/rubiks-cube-mcp-server">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@fritzprix/rubiks-cube-mcp-server/badge" alt="Rubik's Cube Server MCP server" />
</a>

## Features

- **Interactive Cube Manipulation**: Execute standard Rubik's Cube moves (U, D, L, R, F, B and their variations)
- **Configurable Difficulty**: Set scramble difficulty from 1-100 moves for varied challenge levels
- **MCP UI Integration**: Interactive web components delivered directly from the MCP server with clickable game links
- **Game Session Management**: Join existing games or create new ones with customizable settings
- **3D Real-time Visualization**: Beautiful 3D cube visualization using Three.js and WebGL
- **WebSocket Live Updates**: Real-time state synchronization between MCP server and web interface
- **Mouse Interaction**: Rotate and examine the 3D cube with mouse controls
- **Recursive Workflow**: AI agents can systematically work through cube solving using nextAction guidance
- **State Tracking**: Complete move history and current cube state monitoring
- **Solution Detection**: Automatic detection when the cube is solved with celebration effects

## Installation & Setup

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Install Dependencies

```bash
cd rubiks-cube-mcp-server
npm install
```

### Build the Project

```bash
npm run build
```

### Run the Server

```bash
npx rubiks-cube-mcp-server
```

This will start both:

- MCP server on stdio (for AI agent communication)
- Web visualization server on `http://localhost:3000`

## Claude Desktop Configuration

To use this MCP server with Claude Desktop, add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "rubiks-cube": {
      "command": "npx",
      "args": ["rubiks-cube-mcp-server"]
    }
  }
}
```

**Configuration file locations:**

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

After adding the configuration, restart Claude Desktop to load the MCP server.

## MCP Tools

### 1. `startCube`

Initialize a new Rubik's Cube game session.

**Parameters:**

- `scramble` (optional, boolean): Whether to scramble the cube initially (default: true)
- `difficulty` (optional, number): Number of scramble moves (1-100, default: 20)

**Returns:**

- MCP UI resource with clickable game link
- Game ID for the session
- Initial cube state with difficulty level
- Visualization URL
- Next action guidance

### 2. `joinGame`

Join an existing Rubik's Cube game session.

**Parameters:**

- `gameId` (string): The game session ID to join

**Returns:**

- Current cube state
- Game metadata including difficulty
- Next action guidance

### 3. `manipulateCube`

Execute a move on the Rubik's Cube.

**Parameters:**

- `gameId` (string): The game session ID
- `move` (string): Standard cube notation (U, D, L, R, F, B, U', D', L', R', F', B', U2, D2, L2, R2, F2, B2)

**Returns:**

- Updated cube state
- Move execution confirmation
- Total moves count
- Next action guidance

### 4. `finish`

Complete the Rubik's Cube game session.

**Parameters:**

- `gameId` (string): The game session ID

**Returns:**

- Final game statistics
- Move history
- Completion status

## Cube Notation

The server uses standard Rubik's Cube notation:

- **U**: Up face clockwise
- **D**: Down face clockwise
- **L**: Left face clockwise
- **R**: Right face clockwise
- **F**: Front face clockwise
- **B**: Back face clockwise
- **'**: Counter-clockwise (e.g., U')
- **2**: Double turn (e.g., U2)

## Example Usage with AI Agent

```text
Agent: "Start a new Rubik's cube puzzle with easy difficulty"
→ startCube tool called with { scramble: true, difficulty: 5 }
→ Returns MCP UI resource with clickable game link + game state

Agent: "Join existing game cube_123456789_abc"
→ joinGame tool called with gameId
→ Returns current cube state and game metadata

Agent: "Execute move U"
→ manipulateCube tool called with move "U"
→ Returns updated state and nextAction guidance

Agent: "Continue solving..."
→ Recursive manipulateCube calls until solved
→ finish tool called when complete with celebration message
```

## Web Visualization

Visit `http://localhost:3000/game/{gameId}` to see:

- Real-time 3D cube representation
- Color-coded faces (White, Yellow, Red, Orange, Blue, Green)
- Move counter and history
- Interactive move buttons
- Solution status indicator

## MCP UI Features

The server now includes MCP UI integration for enhanced user experience:

- **Clickable Game Links**: When starting a new game, the server returns an interactive UI resource with a clickable link to the web visualization
- **Game Session Management**: Support for joining existing games created by other users or sessions
- **Visual Feedback**: Clear indication of game status, difficulty level, and next actions

### Starting a Game with UI

When you call the `startCube` tool, you'll receive:
1. A clickable UI resource linking directly to the game
2. Complete game state data in JSON format
3. Metadata including difficulty level and next action guidance

### Joining Existing Games

Use the `joinGame` tool with a game ID to participate in games created elsewhere:
- Perfect for collaborative solving
- Maintains full game state and history
- Seamless integration with existing MCP workflow

## Architecture

- **MCP Protocol**: Standard Model Context Protocol for AI agent communication
- **MCP UI Integration**: Interactive web components with `@mcp-ui/server` for clickable resources
- **3D Rendering**: Three.js WebGL-based 3D cube visualization
- **Real-time Communication**: Socket.io WebSocket server for live updates
- **Web Server**: Express.js server for HTTP API and static content
- **State Management**: In-memory game session tracking with live synchronization
- **Configurable Difficulty**: Scalable scramble complexity from beginner to expert levels

## Workflow Pattern

The server follows the recursive MCP pattern:

1. **Start** → Returns nextAction: 'manipulateCube'
2. **Manipulate** → Returns nextAction: 'manipulateCube' (if not solved) or 'finish' (if solved)
3. **Finish** → Returns nextAction: null (workflow complete)

This allows AI agents to work autonomously through the solving process.

## Development

### Watch Mode

```bash
npm run dev
```

### Building

```bash
npm run build
```

### Project Structure

```text
src/
  ├── app.ts              # Main MCP server setup
  ├── cubeLogic.ts        # Rubik's Cube simulation logic
  ├── visualizationServer.ts  # Web visualization server
  └── types.ts            # TypeScript interfaces
```

## License


MIT License - see LICENSE file for details.


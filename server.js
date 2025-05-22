import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

let lobby = [];
let gameStarted = false;
let gameState = null;

function broadcast(msg) {
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(JSON.stringify(msg));
  });
}

app.use(express.static(__dirname));

wss.on('connection', (ws) => {
  if (gameStarted) {
    ws.send(JSON.stringify({ type: 'error', message: 'Game already started.' }));
    ws.close();
    return;
  }
  const playerId = lobby.length;
  lobby.push(ws);
  ws.send(JSON.stringify({ type: 'joined', playerId, lobbySize: lobby.length }));
  broadcast({ type: 'lobby', players: lobby.length });

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }
    if (msg.type === 'start' && ws === lobby[0] && !gameStarted) {
      gameStarted = true;
      gameState = createGameState(lobby.length);
      broadcast({ type: 'start', gameState });
    }
    if (msg.type === 'action' && gameStarted) {
      // TODO: Spielzug verarbeiten, gameState anpassen
      // gameState = ...
      broadcast({ type: 'update', gameState });
    }
  });

  ws.on('close', () => {
    if (!gameStarted) {
      lobby = lobby.filter(s => s !== ws);
      broadcast({ type: 'lobby', players: lobby.length });
    }
  });
});

function createGameState(playerCount) {
  // Einfache UNO-Logik, wie bisher, aber für beliebige Spielerzahl
  // TODO: Deck, Hände, Reihenfolge, etc.
  return {
    players: Array(playerCount).fill(0).map((_, i) => ({ id: i, hand: [] })),
    currentPlayer: 0,
    // ...
  };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('UNO Multiplayer läuft auf http://localhost:' + PORT);
});

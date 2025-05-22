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

function createGameState(playerCount) {
  // UNO-Deck erstellen
  const colors = ['red', 'green', 'blue', 'yellow'];
  let deck = [];
  for (let color of colors) {
    for (let n = 0; n <= 9; n++) {
      deck.push({ color, value: n });
      if (n !== 0) deck.push({ color, value: n });
    }
    for (let i = 0; i < 2; i++) {
      deck.push({ color, value: 'S' });
      deck.push({ color, value: 'R' });
      deck.push({ color, value: '+2' });
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ color: 'wild', value: 'W' });
    deck.push({ color: 'wild', value: '+4' });
  }
  // Mischen
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  // Hände austeilen
  const players = Array(playerCount).fill(0).map((_, i) => ({ id: i, hand: [] }));
  for (let i = 0; i < playerCount; i++) {
    for (let j = 0; j < 7; j++) {
      players[i].hand.push(deck.pop());
    }
  }
  // Erste Karte auf Ablagestapel
  let discardPile = [deck.pop()];
  return {
    players,
    deck,
    discardPile,
    currentPlayer: 0,
    direction: 1,
    currentColor: discardPile[0].color,
    winner: null,
    hasDrawn: false,
    waitingForNextPlayer: false,
    errorMsg: '',
  };
}

function handleAction(gameState, msg, playerId) {
  // msg: { type: 'action', action: {type, ...} }
  if (gameState.winner !== null) return gameState;
  if (gameState.currentPlayer !== playerId) return gameState;
  const player = gameState.players[playerId];
  if (msg.action.type === 'play') {
    const idx = msg.action.idx;
    const card = player.hand[idx];
    const top = gameState.discardPile[gameState.discardPile.length - 1];
    const topColor = gameState.currentColor || top.color;
    const isPlayable = (
      card.color === topColor ||
      card.value === top.value ||
      card.color === 'wild'
    );
    if (!isPlayable) {
      gameState.errorMsg = 'Diese Karte kann nicht gelegt werden!';
      return gameState;
    }
    // Wild-Karten: Farbe wählen
    if (card.color === 'wild') {
      if (!msg.action.chosenColor) {
        gameState.errorMsg = 'Farbe wählen!';
        return gameState;
      }
      card.color = msg.action.chosenColor;
      gameState.currentColor = msg.action.chosenColor;
    } else {
      gameState.currentColor = card.color;
    }
    gameState.discardPile.push(card);
    player.hand.splice(idx, 1);
    // Effekte
    if (card.value === '+2') {
      nextPlayer(gameState);
      for (let i = 0; i < 2; i++) {
        if (gameState.deck.length === 0) reshuffleDeck(gameState);
        gameState.players[gameState.currentPlayer].hand.push(gameState.deck.pop());
      }
      nextPlayer(gameState);
    } else if (card.value === 'S') {
      nextPlayer(gameState, true);
    } else if (card.value === 'R') {
      gameState.direction *= -1;
      nextPlayer(gameState);
    } else if (card.value === '+4') {
      nextPlayer(gameState);
      for (let i = 0; i < 4; i++) {
        if (gameState.deck.length === 0) reshuffleDeck(gameState);
        gameState.players[gameState.currentPlayer].hand.push(gameState.deck.pop());
      }
      nextPlayer(gameState);
    } else {
      if (player.hand.length === 0) {
        gameState.winner = playerId;
        return gameState;
      }
      nextPlayer(gameState);
    }
    if (player.hand.length === 0) {
      gameState.winner = playerId;
    }
    gameState.errorMsg = '';
    return gameState;
  }
  if (msg.action.type === 'draw') {
    if (gameState.hasDrawn) return gameState;
    if (gameState.deck.length === 0) reshuffleDeck(gameState);
    player.hand.push(gameState.deck.pop());
    gameState.hasDrawn = true;
    return gameState;
  }
  if (msg.action.type === 'passen') {
    if (gameState.hasDrawn) {
      gameState.hasDrawn = false;
      nextPlayer(gameState);
    }
    return gameState;
  }
  return gameState;
}

function nextPlayer(gameState, skip = false) {
  const n = gameState.players.length;
  if (skip) {
    gameState.currentPlayer = (gameState.currentPlayer + gameState.direction * 2 + n) % n;
  } else {
    gameState.currentPlayer = (gameState.currentPlayer + gameState.direction + n) % n;
  }
}

function reshuffleDeck(gameState) {
  const last = gameState.discardPile.pop();
  gameState.deck = gameState.deck.concat(gameState.discardPile);
  // Mischen
  for (let i = gameState.deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [gameState.deck[i], gameState.deck[j]] = [gameState.deck[j], gameState.deck[i]];
  }
  gameState.discardPile = [last];
}

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
      gameState = handleAction(gameState, msg, playerId);
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('UNO Multiplayer läuft auf http://localhost:' + PORT);
});

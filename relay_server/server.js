/**
 * Yard Wars v1.1 - Cloud WebSocket Relay & Room Broker
 * Handles 4-letter room matchmaking and bidirectional game packet forwarding
 * Runs 24/7 on Render, Railway, Glitch, Fly.io, or any Node.js host.
 */

const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 8765;

// Basic HTTP health-check server (keeps cloud providers happy)
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    service: 'Yard Wars v1.1 Relay Server',
    status: 'ONLINE',
    uptime: Math.floor(process.uptime()),
    active_rooms: Object.keys(rooms).length
  }));
});

const wss = new WebSocketServer({ server });

// Map: room_code -> { host: ws, guest: ws, code: string }
const rooms = {};

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms[code] ? generateCode() : code;
}

wss.on('connection', (ws) => {
  ws.roomCode = null;
  ws.isHost = false;

  ws.on('message', (message, isBinary) => {
    // If paired and message is binary, forward directly to opponent
    if (ws.roomCode && rooms[ws.roomCode]) {
      const room = rooms[ws.roomCode];
      const opponent = ws.isHost ? room.guest : room.host;
      if (opponent && opponent.readyState === WebSocket.OPEN) {
        opponent.send(message, { binary: isBinary });
        return;
      }
    }

    // Otherwise handle JSON control messages
    try {
      const str = message.toString();
      const data = JSON.parse(str);

      switch (data.action) {
        case 'create_room': {
          const code = (data.room_code || generateCode()).toUpperCase();
          rooms[code] = { host: ws, guest: null, code };
          ws.roomCode = code;
          ws.isHost = true;
          console.log(`[ROOM CREATED] Code: ${code}`);
          ws.send(JSON.stringify({
            action: 'room_created',
            room_code: code,
            is_host: true
          }));
          break;
        }

        case 'join_room': {
          const code = (data.room_code || '').toUpperCase().trim();
          if (!rooms[code]) {
            ws.send(JSON.stringify({
              action: 'error',
              message: `Room '${code}' does not exist.`
            }));
            return;
          }
          const room = rooms[code];
          if (room.guest && room.guest.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              action: 'error',
              message: `Room '${code}' is already full.`
            }));
            return;
          }

          room.guest = ws;
          ws.roomCode = code;
          ws.isHost = false;
          console.log(`[ROOM JOINED] Guest paired in Room: ${code}`);

          // Notify guest
          ws.send(JSON.stringify({
            action: 'room_joined',
            room_code: code,
            is_host: false
          }));

          // Notify host
          if (room.host && room.host.readyState === WebSocket.OPEN) {
            room.host.send(JSON.stringify({
              action: 'peer_joined',
              room_code: code
            }));
          }
          break;
        }

        case 'game_action': {
          // Relay game action to opponent
          if (ws.roomCode && rooms[ws.roomCode]) {
            const room = rooms[ws.roomCode];
            const opponent = ws.isHost ? room.guest : room.host;
            if (opponent && opponent.readyState === WebSocket.OPEN) {
              opponent.send(str);
            }
          }
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ action: 'pong' }));
          break;
        }
      }
    } catch (e) {
      console.error('Error parsing packet:', e.message);
    }
  });

  ws.on('close', () => {
    if (ws.roomCode && rooms[ws.roomCode]) {
      const room = rooms[ws.roomCode];
      console.log(`[DISCONNECT] ${ws.isHost ? 'Host' : 'Guest'} left room ${ws.roomCode}`);
      const opponent = ws.isHost ? room.guest : room.host;
      if (opponent && opponent.readyState === WebSocket.OPEN) {
        opponent.send(JSON.stringify({
          action: 'peer_left',
          message: ws.isHost ? 'Host closed the room.' : 'Opponent disconnected.'
        }));
      }
      if (ws.isHost) {
        delete rooms[ws.roomCode];
      } else {
        room.guest = null;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  YARD WARS v1.1 - CLOUD RELAY SERVER`);
  console.log(`  Listening on port ${PORT}`);
  console.log(`  Ready for 4-letter room code matchmaking!`);
  console.log(`====================================================`);
});

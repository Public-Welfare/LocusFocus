import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';
import {
  initDatabase,
  createRoom,
  getRoom,
  addUserToRoom,
  getRoomUsers,
  setLock,
  getLock,
  getAllLocks,
  getRoomState,
  cleanupOldRooms
} from './database.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initDatabase();

// HTTP Server
const server = createServer(app);

// WebSocket Server for real-time updates
const wss = new WebSocketServer({ server });

// Store active WebSocket connections by room
const roomConnections = new Map();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  let currentRoomId = null;
  let currentUserId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === 'join') {
        currentRoomId = data.roomId;
        currentUserId = data.userId;

        if (!roomConnections.has(currentRoomId)) {
          roomConnections.set(currentRoomId, new Set());
        }
        roomConnections.get(currentRoomId).add(ws);

        // Send current room state
        const state = getRoomState(currentRoomId);
        ws.send(JSON.stringify({ type: 'state', data: state }));
      }

      if (data.type === 'leave') {
        if (currentRoomId && roomConnections.has(currentRoomId)) {
          roomConnections.get(currentRoomId).delete(ws);
        }
        currentRoomId = null;
        currentUserId = null;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    if (currentRoomId && roomConnections.has(currentRoomId)) {
      roomConnections.get(currentRoomId).delete(ws);
      if (roomConnections.get(currentRoomId).size === 0) {
        roomConnections.delete(currentRoomId);
      }
    }
  });
});

// Broadcast room state to all connected clients in a room
function broadcastToRoom(roomId, data) {
  if (roomConnections.has(roomId)) {
    const message = JSON.stringify(data);
    roomConnections.get(roomId).forEach(client => {
      if (client.readyState === 1) { // OPEN
        client.send(message);
      }
    });
  }
}

// REST API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Create or join a room
app.post('/api/rooms/:roomId/join', (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, username } = req.body;

    if (!userId || !username) {
      return res.status(400).json({ error: 'userId and username are required' });
    }

    // Create room if it doesn't exist
    let room = getRoom(roomId);
    if (!room) {
      room = createRoom(roomId);
    }

    // Add user to room
    addUserToRoom(roomId, userId, username);

    // Get updated room state
    const state = getRoomState(roomId);

    // Broadcast to all clients in room
    broadcastToRoom(roomId, { type: 'user_joined', userId, username, state });

    res.json({ success: true, room: state });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Get room state
app.get('/api/rooms/:roomId', (req, res) => {
  try {
    const { roomId } = req.params;
    const state = getRoomState(roomId);

    if (!state) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json(state);
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Failed to get room state' });
  }
});

// Set lock status
app.post('/api/rooms/:roomId/lock', (req, res) => {
  try {
    const { roomId } = req.params;
    const { targetUserId, lockedByUserId, locked } = req.body;

    if (!targetUserId || !lockedByUserId || typeof locked !== 'boolean') {
      return res.status(400).json({ error: 'Invalid lock data' });
    }

    const room = getRoom(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Set the lock
    setLock(roomId, targetUserId, lockedByUserId, locked);

    // Get updated state
    const state = getRoomState(roomId);

    // Broadcast to all clients in room
    broadcastToRoom(roomId, { 
      type: 'lock_changed', 
      targetUserId, 
      lockedByUserId, 
      locked,
      state 
    });

    res.json({ success: true, lock: getLock(roomId, targetUserId) });
  } catch (error) {
    console.error('Set lock error:', error);
    res.status(500).json({ error: 'Failed to set lock' });
  }
});

// Get lock status for a specific user
app.get('/api/rooms/:roomId/locks/:userId', (req, res) => {
  try {
    const { roomId, userId } = req.params;
    const lock = getLock(roomId, userId);

    if (!lock) {
      return res.json({ locked: false, lockedBy: null });
    }

    res.json({
      locked: lock.locked === 1,
      lockedBy: lock.locked_by_user_id,
      timestamp: lock.timestamp
    });
  } catch (error) {
    console.error('Get lock error:', error);
    res.status(500).json({ error: 'Failed to get lock status' });
  }
});

// Get all locks in a room
app.get('/api/rooms/:roomId/locks', (req, res) => {
  try {
    const { roomId } = req.params;
    const locks = getAllLocks(roomId);

    const locksMap = {};
    locks.forEach(lock => {
      locksMap[lock.target_user_id] = {
        locked: lock.locked === 1,
        lockedBy: lock.locked_by_user_id,
        timestamp: lock.timestamp
      };
    });

    res.json({ locks: locksMap });
  } catch (error) {
    console.error('Get locks error:', error);
    res.status(500).json({ error: 'Failed to get locks' });
  }
});

// Cleanup endpoint (admin use)
app.post('/api/admin/cleanup', (req, res) => {
  try {
    const { daysOld = 30 } = req.body;
    const deleted = cleanupOldRooms(daysOld);
    res.json({ success: true, deletedRooms: deleted });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

// Start server
server.listen(port, () => {
  console.log(`🚀 LocusFocus Backend Server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🔌 WebSocket: ws://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

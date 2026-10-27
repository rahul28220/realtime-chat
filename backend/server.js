const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Message = require('./models/Message');
const User = require('./models/User');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pulse_chat';
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.warn('Running without MongoDB persistence:', err.message));

// Track active online users in memory
let activeUsers = new Map(); // socketId -> { username, room }

// REST Endpoints
app.get('/api/messages/:room', async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.room }).sort({ timestamp: 1 }).limit(50);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WebSockets via Socket.io
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // User joins room
  socket.on('join_room', async ({ username, room }) => {
    socket.join(room);
    activeUsers.set(socket.id, { username, room });

    // Broadcast updated users list
    const roomUsers = Array.from(activeUsers.values()).filter(u => u.room === room);
    io.to(room).emit('room_users', roomUsers);

    // Broadcast system message
    const joinNotice = {
      sender: 'System',
      room,
      text: `${username} joined the channel.`,
      timestamp: new Date().toISOString(),
      isSystem: true
    };
    socket.to(room).emit('receive_message', joinNotice);
  });

  // Sending a message
  socket.on('send_message', async (data) => {
    const messagePayload = {
      sender: data.sender,
      room: data.room,
      text: data.text,
      timestamp: new Date().toISOString(),
      status: 'read'
    };

    // Save to MongoDB if connected
    try {
      await Message.create(messagePayload);
    } catch (e) {
      // continues even if db is offline
    }

    io.to(data.room).emit('receive_message', messagePayload);
  });

  // User typing indicator
  socket.on('typing', ({ username, room }) => {
    socket.to(room).emit('user_typing', { username });
  });

  socket.on('stop_typing', ({ room }) => {
    socket.to(room).emit('user_stop_typing');
  });

  // User Disconnect
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      activeUsers.delete(socket.id);
      const roomUsers = Array.from(activeUsers.values()).filter(u => u.room === user.room);
      io.to(user.room).emit('room_users', roomUsers);

      socket.to(user.room).emit('receive_message', {
        sender: 'System',
        room: user.room,
        text: `${user.username} left the channel.`,
        timestamp: new Date().toISOString(),
        isSystem: true
      });
    }
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`PulseChat Server running on http://localhost:${PORT}`));
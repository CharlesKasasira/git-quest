// Simple WebSocket server for Git Quest multiplayer functionality
const { Server } = require('socket.io');
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});

// Store active users and challenges
const activeUsers = new Map();
const activeChallenges = new Map();
const liveCollaborations = new Map();
const chatMessages = [];
const globalLeaderboard = [];

// Helper functions
const generateId = () => Math.random().toString(36).substring(2, 15);
const broadcastUserList = () => {
  const users = Array.from(activeUsers.values());
  io.emit('user:list', users);
};

const broadcastLeaderboard = () => {
  io.emit('leaderboard:update', globalLeaderboard);
};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User authentication and join
  socket.on('user:join', (userData) => {
    const user = {
      id: socket.id,
      username: userData.username || `User_${socket.id.substring(0, 6)}`,
      avatar: userData.avatar || '👤',
      currentLevel: userData.currentLevel || 1,
      isOnline: true,
      lastSeen: new Date(),
      skills: userData.skills || [],
      achievements: userData.achievements || [],
      experience: userData.experience || 0,
      rank: userData.rank || 'Beginner'
    };

    activeUsers.set(socket.id, user);
    socket.emit('user:authenticated', user);
    socket.broadcast.emit('user:joined', user);
    broadcastUserList();
    
    console.log('User joined:', user.username);
  });

  // User presence updates
  socket.on('user:presence', (presence) => {
    const user = activeUsers.get(socket.id);
    if (user) {
      user.lastSeen = new Date();
      socket.broadcast.emit('user:presence', presence);
    }
  });

  // Challenge creation
  socket.on('challenge:create', (challenge) => {
    activeChallenges.set(challenge.id, challenge);
    socket.broadcast.emit('challenge:received', challenge);
    console.log('Challenge created:', challenge.id);
  });

  // Challenge acceptance
  socket.on('challenge:accept', (challengeId) => {
    const challenge = activeChallenges.get(challengeId);
    if (challenge) {
      challenge.status = 'active';
      challenge.startedAt = new Date();
      activeChallenges.set(challengeId, challenge);
      io.emit('challenge:accepted', challenge);
      console.log('Challenge accepted:', challengeId);
    }
  });

  // Challenge completion
  socket.on('challenge:complete', (challengeId, score) => {
    const challenge = activeChallenges.get(challengeId);
    if (challenge) {
      challenge.status = 'completed';
      challenge.completedAt = new Date();
      challenge.score = score;
      activeChallenges.set(challengeId, challenge);
      io.emit('challenge:completed', challenge);
      console.log('Challenge completed:', challengeId);
    }
  });

  // Challenge decline
  socket.on('challenge:decline', (challengeId) => {
    const challenge = activeChallenges.get(challengeId);
    if (challenge) {
      challenge.status = 'cancelled';
      activeChallenges.set(challengeId, challenge);
      io.emit('challenge:cancelled', challenge);
      console.log('Challenge declined:', challengeId);
    }
  });

  // Collaboration creation
  socket.on('collaboration:create', (collaboration) => {
    liveCollaborations.set(collaboration.id, collaboration);
    io.emit('collaboration:created', collaboration);
    console.log('Collaboration created:', collaboration.id);
  });

  // Collaboration updates
  socket.on('collaboration:update', (collaboration) => {
    liveCollaborations.set(collaboration.id, collaboration);
    socket.broadcast.emit('collaboration:update', collaboration);
  });

  // Live changes in collaboration
  socket.on('collaboration:change', (collaborationId, change) => {
    const collaboration = liveCollaborations.get(collaborationId);
    if (collaboration) {
      collaboration.liveChanges.push(change);
      liveCollaborations.set(collaborationId, collaboration);
      socket.broadcast.emit('collaboration:change', collaborationId, change);
    }
  });

  // Chat messages
  socket.on('chat:message', (message) => {
    chatMessages.push(message);
    io.emit('chat:message', message);
    console.log('Chat message:', message.username, message.message);
  });

  // User typing
  socket.on('chat:typing', (isTyping) => {
    const user = activeUsers.get(socket.id);
    if (user) {
      socket.broadcast.emit('chat:typing', user.id, isTyping);
    }
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      console.log('User disconnected:', user.username);
      activeUsers.delete(socket.id);
      socket.broadcast.emit('user:left', socket.id);
      broadcastUserList();
    }
  });

  // Error handling
  socket.on('error', (error) => {
    console.error('Socket error:', error);
    socket.emit('error', 'An error occurred');
  });
});

// API endpoints
app.get('/api/users', (req, res) => {
  res.json(Array.from(activeUsers.values()));
});

app.get('/api/challenges', (req, res) => {
  res.json(Array.from(activeChallenges.values()));
});

app.get('/api/collaborations', (req, res) => {
  res.json(Array.from(liveCollaborations.values()));
});

app.get('/api/leaderboard', (req, res) => {
  res.json(globalLeaderboard);
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Git Quest Multiplayer Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
  console.log(`🌐 CORS enabled for http://localhost:3001`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});


// WebSocket server for Git Quest multiplayer gameplay.
import { createServer } from 'node:http';
import express from 'express';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const configuredOrigins = process.env.CLIENT_ORIGIN || process.env.FRONTEND_ORIGIN;
const allowedOrigins = configuredOrigins
  ? configuredOrigins.split(',').map((origin) => origin.trim()).filter(Boolean)
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

const activeUsers = new Map();
const activeChallenges = new Map();
const liveCollaborations = new Map();
const rooms = new Map();
const chatMessages = [];
const challengeResults = [];
const globalLeaderboard = [];

const generateId = () => Math.random().toString(36).substring(2, 15);

const createSharedRepository = () => ({
  initialized: false,
  files: [],
  branches: [],
  currentBranch: '',
  commits: [],
  config: {},
  workingDirectory: '/shared-project',
});

const getRoomList = () => Array.from(rooms.values()).filter((room) => room.status !== 'closed');

const broadcastUserList = () => {
  io.emit('user:list', Array.from(activeUsers.values()));
};

const broadcastRoomList = () => {
  io.emit('room:list', getRoomList());
};

const emitToUsers = (userIds, eventName, ...payload) => {
  [...new Set(userIds.filter(Boolean))].forEach((userId) => {
    io.to(userId).emit(eventName, ...payload);
  });
};

const emitChallengeEvent = (challenge, eventName, payload) => {
  if (challenge.roomId) {
    io.to(challenge.roomId).emit(eventName, payload);
    return;
  }

  if (challenge.visibility === 'public') {
    io.emit(eventName, payload);
    return;
  }

  emitToUsers([challenge.challenger?.id, challenge.challenged?.id], eventName, payload);
};

const getChallengeWinner = (score) => {
  if (!score) {
    return null;
  }

  if (score.challenger === score.challenged) {
    return null;
  }

  return score.challenger > score.challenged ? 'challenger' : 'challenged';
};

const buildChallengeResult = (challenge, score) => {
  const winnerSide = getChallengeWinner(score);
  const winner = winnerSide ? challenge[winnerSide] : undefined;
  const result = {
    id: `result_${generateId()}`,
    challengeId: challenge.id,
    challenger: challenge.challenger,
    challenged: challenge.challenged,
    score,
    summary: winner
      ? `${winner.username} won ${challenge.type} on ${challenge.difficulty}.`
      : `${challenge.type} on ${challenge.difficulty} ended in a draw.`,
    completedAt: new Date(),
  };

  if (challenge.roomId) {
    result.roomId = challenge.roomId;
  }

  if (winner) {
    result.winner = winner;
  }

  return result;
};

const updateLeaderboardFromResult = (result) => {
  const players = [result.challenger, result.challenged];

  players.forEach((player) => {
    const existing = globalLeaderboard.find((entry) => entry.user.id === player.id);
    const won = result.winner?.id === player.id;

    if (existing) {
      existing.score += won ? 100 : 25;
      existing.challengesWon += won ? 1 : 0;
      existing.challengesLost += won ? 0 : 1;
      const total = existing.challengesWon + existing.challengesLost;
      existing.winRate = total > 0 ? existing.challengesWon / total : 0;
      return;
    }

    globalLeaderboard.push({
      user: player,
      score: won ? 100 : 25,
      rank: globalLeaderboard.length + 1,
      level: player.currentLevel || 1,
      achievements: player.achievements?.length || 0,
      challengesWon: won ? 1 : 0,
      challengesLost: won ? 0 : 1,
      winRate: won ? 1 : 0,
    });
  });

  globalLeaderboard.sort((left, right) => right.score - left.score);
  globalLeaderboard.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  io.emit('leaderboard:update', globalLeaderboard);
};

const syncRoom = (roomId) => {
  const room = rooms.get(roomId);
  if (room) {
    io.emit('room:updated', room);
  }
};

const closeRoomIfEmpty = (roomId) => {
  const room = rooms.get(roomId);
  if (!room) {
    return;
  }

  if (room.participants.length === 0 && room.spectators.length === 0) {
    room.status = 'closed';
    room.updatedAt = new Date();
    rooms.delete(roomId);
    io.emit('room:closed', roomId);
    broadcastRoomList();
  }
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user:join', (userData) => {
    const payload = userData || {};
    const user = {
      id: socket.id,
      username: payload.username || `User_${socket.id.substring(0, 6)}`,
      avatar: payload.avatar || '👤',
      currentLevel: payload.currentLevel || 1,
      isOnline: true,
      lastSeen: new Date(),
      skills: payload.skills || [],
      achievements: payload.achievements || [],
      experience: payload.experience || 0,
      rank: payload.rank || 'Beginner',
    };

    activeUsers.set(socket.id, user);
    socket.emit('user:authenticated', user);
    socket.emit('room:list', getRoomList());
    socket.broadcast.emit('user:joined', user);
    broadcastUserList();
  });

  socket.on('user:presence', (presence) => {
    const user = activeUsers.get(socket.id);
    if (user) {
      user.lastSeen = new Date();
      socket.broadcast.emit('user:presence', presence);
    }
  });

  socket.on('room:create', (requestedRoom) => {
    const user = activeUsers.get(socket.id);
    if (!user) {
      socket.emit('error', 'Join multiplayer before creating a room.');
      return;
    }

    const room = {
      id: requestedRoom?.id || `room_${generateId()}`,
      name: requestedRoom?.name || `${user.username}'s Room`,
      ownerId: user.id,
      participants: [user],
      spectators: [],
      activeChallengeIds: [],
      collaborationIds: [],
      sharedRepository: requestedRoom?.sharedRepository || createSharedRepository(),
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    rooms.set(room.id, room);
    socket.join(room.id);
    io.emit('room:created', room);
    broadcastRoomList();
  });

  socket.on('room:join', (roomId) => {
    const user = activeUsers.get(socket.id);
    const room = rooms.get(roomId);
    if (!user || !room) {
      socket.emit('error', 'Room is no longer available.');
      return;
    }

    room.participants = [...room.participants.filter((participant) => participant.id !== user.id), user];
    room.spectators = room.spectators.filter((spectator) => spectator.id !== user.id);
    room.status = 'active';
    room.updatedAt = new Date();
    socket.join(room.id);
    rooms.set(room.id, room);
    syncRoom(room.id);
    broadcastRoomList();
  });

  socket.on('room:leave', (roomId) => {
    const room = rooms.get(roomId);
    if (!room) {
      return;
    }

    room.participants = room.participants.filter((participant) => participant.id !== socket.id);
    room.spectators = room.spectators.filter((spectator) => spectator.id !== socket.id);
    room.updatedAt = new Date();
    socket.leave(room.id);
    rooms.set(room.id, room);
    syncRoom(room.id);
    closeRoomIfEmpty(room.id);
    broadcastRoomList();
  });

  socket.on('room:spectate', (roomId) => {
    const user = activeUsers.get(socket.id);
    const room = rooms.get(roomId);
    if (!user || !room) {
      socket.emit('error', 'Room is no longer available.');
      return;
    }

    room.spectators = [...room.spectators.filter((spectator) => spectator.id !== user.id), user];
    room.participants = room.participants.filter((participant) => participant.id !== user.id);
    room.updatedAt = new Date();
    socket.join(room.id);
    rooms.set(room.id, room);
    syncRoom(room.id);
    broadcastRoomList();
  });

  socket.on('room:stop-spectating', (roomId) => {
    const room = rooms.get(roomId);
    if (!room) {
      return;
    }

    room.spectators = room.spectators.filter((spectator) => spectator.id !== socket.id);
    room.updatedAt = new Date();
    socket.leave(room.id);
    rooms.set(room.id, room);
    syncRoom(room.id);
    closeRoomIfEmpty(room.id);
    broadcastRoomList();
  });

  socket.on('repo:update', (update) => {
    const user = activeUsers.get(socket.id);
    if (!user || !update?.repository) {
      socket.emit('error', 'Shared repository update is invalid.');
      return;
    }

    const sharedUpdate = {
      ...update,
      updatedBy: user.id,
      updatedAt: new Date(),
    };

    if (update.roomId) {
      const room = rooms.get(update.roomId);
      if (room) {
        room.sharedRepository = update.repository;
        room.updatedAt = sharedUpdate.updatedAt;
        rooms.set(room.id, room);
        io.to(room.id).emit('repo:updated', sharedUpdate);
        syncRoom(room.id);
      }
    }

    if (update.collaborationId) {
      const collaboration = liveCollaborations.get(update.collaborationId);
      if (collaboration) {
        collaboration.sharedRepository = update.repository;
        collaboration.updatedAt = sharedUpdate.updatedAt;
        if (update.change) {
          collaboration.liveChanges = [...(collaboration.liveChanges || []), update.change];
        }
        liveCollaborations.set(collaboration.id, collaboration);
        emitToUsers(
          [
            ...(collaboration.participants || []).map((participant) => participant.id),
            ...(collaboration.spectators || []).map((spectator) => spectator.id),
          ],
          'repo:updated',
          sharedUpdate
        );
        emitToUsers(
          (collaboration.participants || []).map((participant) => participant.id),
          'collaboration:update',
          collaboration
        );
      }
    }
  });

  socket.on('challenge:create', (requestedChallenge) => {
    const challenger = activeUsers.get(socket.id);
    if (!challenger || !requestedChallenge?.challenged) {
      socket.emit('error', 'Challenge requires an active challenger and challenged player.');
      return;
    }

    const challenge = {
      ...requestedChallenge,
      id: requestedChallenge.id || `challenge_${generateId()}`,
      challenger,
      visibility: requestedChallenge.roomId ? 'room' : (requestedChallenge.visibility || 'private'),
      status: 'pending',
      createdAt: new Date(),
    };

    activeChallenges.set(challenge.id, challenge);

    if (challenge.roomId) {
      const room = rooms.get(challenge.roomId);
      if (room) {
        room.activeChallengeIds = [...new Set([...room.activeChallengeIds, challenge.id])];
        room.updatedAt = new Date();
        rooms.set(room.id, room);
        syncRoom(room.id);
      }
    }

    emitChallengeEvent(challenge, 'challenge:received', challenge);
  });

  socket.on('challenge:accept', (challengeId) => {
    const challenge = activeChallenges.get(challengeId);
    if (!challenge) {
      socket.emit('error', 'Challenge is no longer available.');
      return;
    }

    challenge.status = 'active';
    challenge.startedAt = new Date();
    activeChallenges.set(challengeId, challenge);
    emitChallengeEvent(challenge, 'challenge:accepted', challenge);
  });

  socket.on('challenge:complete', (challengeId, score) => {
    const challenge = activeChallenges.get(challengeId);
    if (!challenge) {
      socket.emit('error', 'Challenge is no longer available.');
      return;
    }

    challenge.status = 'completed';
    challenge.completedAt = new Date();
    challenge.score = score;
    const result = buildChallengeResult(challenge, score);
    if (result.winner) {
      challenge.winner = result.winner;
    }

    activeChallenges.set(challengeId, challenge);
    challengeResults.unshift(result);
    updateLeaderboardFromResult(result);
    emitChallengeEvent(challenge, 'challenge:completed', challenge);
    emitChallengeEvent(challenge, 'challenge:result', result);

    if (challenge.roomId) {
      const room = rooms.get(challenge.roomId);
      if (room) {
        room.activeChallengeIds = room.activeChallengeIds.filter((id) => id !== challenge.id);
        room.updatedAt = new Date();
        rooms.set(room.id, room);
        syncRoom(room.id);
      }
    }
  });

  socket.on('challenge:decline', (challengeId) => {
    const challenge = activeChallenges.get(challengeId);
    if (!challenge) {
      return;
    }

    challenge.status = 'cancelled';
    activeChallenges.set(challengeId, challenge);
    emitChallengeEvent(challenge, 'challenge:cancelled', challenge);
  });

  socket.on('collaboration:create', (requestedCollaboration) => {
    const user = activeUsers.get(socket.id);
    if (!user || !requestedCollaboration) {
      socket.emit('error', 'Join multiplayer before creating a collaboration.');
      return;
    }

    const collaboration = {
      ...requestedCollaboration,
      id: requestedCollaboration.id || `collab_${generateId()}`,
      participants: [
        user,
        ...(requestedCollaboration.participants || []).filter((participant) => participant.id !== user.id),
      ],
      spectators: requestedCollaboration.spectators || [],
      sharedRepository: requestedCollaboration.sharedRepository || createSharedRepository(),
      activeUser: user.id,
      liveChanges: requestedCollaboration.liveChanges || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    liveCollaborations.set(collaboration.id, collaboration);
    socket.join(collaboration.id);

    if (collaboration.roomId) {
      const room = rooms.get(collaboration.roomId);
      if (room) {
        room.collaborationIds = [...new Set([...room.collaborationIds, collaboration.id])];
        room.updatedAt = new Date();
        rooms.set(room.id, room);
        io.to(room.id).emit('collaboration:created', collaboration);
        syncRoom(room.id);
      }
    } else {
      emitToUsers(
        collaboration.participants.map((participant) => participant.id),
        'collaboration:created',
        collaboration
      );
    }
  });

  socket.on('collaboration:join', (collaborationId, userPayload) => {
    const user = activeUsers.get(socket.id) || userPayload;
    const collaboration = liveCollaborations.get(collaborationId);
    if (collaboration && user) {
      collaboration.participants = [
        ...(collaboration.participants || []).filter((participant) => participant.id !== user.id),
        user,
      ];
      collaboration.spectators = (collaboration.spectators || []).filter((spectator) => spectator.id !== user.id);
      collaboration.updatedAt = new Date();
      liveCollaborations.set(collaborationId, collaboration);
      socket.join(collaborationId);
      emitToUsers(
        collaboration.participants.map((participant) => participant.id),
        'collaboration:update',
        collaboration
      );
    }
  });

  socket.on('collaboration:leave', (collaborationId, userId) => {
    const collaboration = liveCollaborations.get(collaborationId);
    if (collaboration) {
      collaboration.participants = (collaboration.participants || []).filter(
        (participant) => participant.id !== userId
      );
      collaboration.spectators = (collaboration.spectators || []).filter(
        (spectator) => spectator.id !== userId
      );
      collaboration.updatedAt = new Date();
      liveCollaborations.set(collaborationId, collaboration);
      socket.leave(collaborationId);
      emitToUsers(
        [
          ...collaboration.participants.map((participant) => participant.id),
          ...collaboration.spectators.map((spectator) => spectator.id),
        ],
        'collaboration:update',
        collaboration
      );
    }
  });

  socket.on('collaboration:update', (collaboration) => {
    collaboration.updatedAt = new Date();
    liveCollaborations.set(collaboration.id, collaboration);
    emitToUsers(
      [
        ...(collaboration.participants || []).map((participant) => participant.id),
        ...(collaboration.spectators || []).map((spectator) => spectator.id),
      ],
      'collaboration:update',
      collaboration
    );
  });

  socket.on('collaboration:change', (collaborationId, change) => {
    const collaboration = liveCollaborations.get(collaborationId);
    if (collaboration) {
      collaboration.liveChanges = [...(collaboration.liveChanges || []), change];
      collaboration.updatedAt = new Date();
      liveCollaborations.set(collaborationId, collaboration);
      emitToUsers(
        [
          ...(collaboration.participants || []).map((participant) => participant.id),
          ...(collaboration.spectators || []).map((spectator) => spectator.id),
        ],
        'collaboration:change',
        collaborationId,
        change
      );
      emitToUsers(
        [
          ...(collaboration.participants || []).map((participant) => participant.id),
          ...(collaboration.spectators || []).map((spectator) => spectator.id),
        ],
        'collaboration:update',
        collaboration
      );
    }
  });

  socket.on('chat:message', (message) => {
    chatMessages.push(message);
    io.emit('chat:message', message);
  });

  socket.on('chat:typing', (isTyping) => {
    const user = activeUsers.get(socket.id);
    if (user) {
      socket.broadcast.emit('chat:typing', user.id, isTyping);
    }
  });

  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      activeUsers.delete(socket.id);
      socket.broadcast.emit('user:left', socket.id);
      broadcastUserList();
    }

    rooms.forEach((room) => {
      const hadUser = room.participants.some((participant) => participant.id === socket.id)
        || room.spectators.some((spectator) => spectator.id === socket.id);
      if (!hadUser) {
        return;
      }

      room.participants = room.participants.filter((participant) => participant.id !== socket.id);
      room.spectators = room.spectators.filter((spectator) => spectator.id !== socket.id);
      room.updatedAt = new Date();
      rooms.set(room.id, room);
      syncRoom(room.id);
      closeRoomIfEmpty(room.id);
    });

    liveCollaborations.forEach((collaboration) => {
      collaboration.participants = (collaboration.participants || []).filter(
        (participant) => participant.id !== socket.id
      );
      collaboration.spectators = (collaboration.spectators || []).filter(
        (spectator) => spectator.id !== socket.id
      );
      collaboration.updatedAt = new Date();
      liveCollaborations.set(collaboration.id, collaboration);
      emitToUsers(
        [
          ...collaboration.participants.map((participant) => participant.id),
          ...collaboration.spectators.map((spectator) => spectator.id),
        ],
        'collaboration:update',
        collaboration
      );
    });

    broadcastRoomList();
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
    socket.emit('error', 'An error occurred');
  });
});

app.get('/api/users', (req, res) => {
  res.json(Array.from(activeUsers.values()));
});

app.get('/api/rooms', (req, res) => {
  res.json(getRoomList());
});

app.get('/api/challenges', (req, res) => {
  res.json(Array.from(activeChallenges.values()));
});

app.get('/api/challenge-results', (req, res) => {
  res.json(challengeResults);
});

app.get('/api/collaborations', (req, res) => {
  res.json(Array.from(liveCollaborations.values()));
});

app.get('/api/leaderboard', (req, res) => {
  res.json(globalLeaderboard);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Git Quest Multiplayer Server running on port ${PORT}`);
  console.log('WebSocket server ready for connections');
  console.log(`CORS enabled for ${allowedOrigins.join(', ')}`);
});

process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

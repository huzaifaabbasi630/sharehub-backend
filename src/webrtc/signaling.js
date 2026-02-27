const setupWebRTCSignaling = (io) => {
  io.on('connection', (socket) => {
    
    socket.on('join_call', (data) => {
      const { roomCode, userId, userName } = data;
      socket.join(`${roomCode}-call`);
      socket.to(`${roomCode}-call`).emit('user_joined_call', { userId, userName });
    });

    socket.on('leave_call', (data) => {
      const { roomCode, userId } = data;
      socket.leave(`${roomCode}-call`);
      socket.to(`${roomCode}-call`).emit('user_left_call', { userId });
    });

    socket.on('webrtc_offer', (data) => {
      const { targetId, offer, senderId } = data;
      io.to(targetId).emit('webrtc_offer', { offer, senderId });
    });

    socket.on('webrtc_answer', (data) => {
      const { targetId, answer, senderId } = data;
      io.to(targetId).emit('webrtc_answer', { answer, senderId });
    });

    socket.on('webrtc_ice_candidate', (data) => {
      const { targetId, candidate, senderId } = data;
      io.to(targetId).emit('webrtc_ice_candidate', { candidate, senderId });
    });

    socket.on('mute_audio', (data) => {
      const { roomCode, userId, muted } = data;
      socket.to(`${roomCode}-call`).emit('user_muted', { userId, muted });
    });

    socket.on('disable_video', (data) => {
      const { roomCode, userId, disabled } = data;
      socket.to(`${roomCode}-call`).emit('user_video_disabled', { userId, disabled });
    });
  });
};

module.exports = { setupWebRTCSignaling };

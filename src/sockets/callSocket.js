const { CallLog } = require('../models/CallLog.js');

const activeCalls = new Map();

const setupCallSocket = (io) => {
  io.on('connection', (socket) => {
    
    socket.on('start_call', async (data) => {
      try {
        const { roomId, roomCode, callerId, callerName, callType } = data;
        
        const callLog = await CallLog.create({
          roomId,
          callerId,
          callerName,
          callType,
          participants: [{ userId: callerId, name: callerName, joinedAt: new Date() }]
        });
        
        activeCalls.set(roomCode, {
          callId: callLog._id,
          callerId,
          callType
        });
        
        socket.to(roomCode).emit('incoming_call', {
          callId: callLog._id,
          callerId,
          callerName,
          callType
        });
        
        socket.emit('call_started', { callId: callLog._id });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('accept_call', async (data) => {
      try {
        const { roomCode, userId, userName } = data;
        
        const call = activeCalls.get(roomCode);
        
        if (call) {
          await CallLog.findByIdAndUpdate(call.callId, {
            $push: { participants: { userId, name: userName, joinedAt: new Date() } }
          });
          
          socket.to(roomCode).emit('call_accepted', { userId, userName });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('reject_call', (data) => {
      const { roomCode, userId } = data;
      socket.to(roomCode).emit('call_rejected', { userId });
    });

    socket.on('end_call', async (data) => {
      try {
        const { roomCode, userId } = data;
        
        const call = activeCalls.get(roomCode);
        
        if (call) {
          const callLog = await CallLog.findById(call.callId);
          
          if (callLog) {
            callLog.endedAt = new Date();
            callLog.duration = Math.floor((callLog.endedAt - callLog.startedAt) / 1000);
            
            const participant = callLog.participants.find(p => p.userId === userId);
            if (participant) {
              participant.leftAt = new Date();
            }
            
            await callLog.save();
          }
          
          activeCalls.delete(roomCode);
        }
        
        socket.to(roomCode).emit('call_ended', { userId });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('offer', (data) => {
      const { roomCode, offer, senderId } = data;
      socket.to(roomCode).emit('offer', { offer, senderId });
    });

    socket.on('answer', (data) => {
      const { roomCode, answer, senderId } = data;
      socket.to(roomCode).emit('answer', { answer, senderId });
    });

    socket.on('ice_candidate', (data) => {
      const { roomCode, candidate, senderId } = data;
      socket.to(roomCode).emit('ice_candidate', { candidate, senderId });
    });

    socket.on('screen_share_started', (data) => {
      const { roomCode, userId } = data;
      socket.to(roomCode).emit('screen_share_started', { userId });
    });

    socket.on('screen_share_stopped', (data) => {
      const { roomCode, userId } = data;
      socket.to(roomCode).emit('screen_share_stopped', { userId });
    });
  });
};

module.exports = { setupCallSocket };

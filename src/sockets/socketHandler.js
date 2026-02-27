import { Room } from '../models/Room.js';
import { Message } from '../models/Message.js';
import { JoinRequest } from '../models/JoinRequest.js';
import { inMemoryRooms, inMemoryMessages, inMemoryJoinRequests } from '../utils/memoryStore.js';

const activeUsers = new Map();

export const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create_room', async (data) => {
      try {
        const { roomCode, userName } = data;
        const upperCode = roomCode.toUpperCase();
        
        socket.join(upperCode);
        activeUsers.set(socket.id, { roomCode: upperCode, userName, isHost: true });
        
        // Also track in shared memory for lookup
        if (!inMemoryRooms.has(upperCode)) {
          inMemoryRooms.set(upperCode, {
            _id: Date.now().toString(),
            code: upperCode,
            name: 'Room ' + upperCode,
            hostId: socket.id,
            hostName: userName,
            participants: [{ socketId: socket.id, name: userName }],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
        
        socket.emit('room_created', { roomCode: upperCode, socketId: socket.id });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('send_join_request', async (data) => {
      try {
        const { roomCode, userName, isOneTimeLink, token } = data;
        const upperCode = roomCode.toUpperCase();
        
        console.log('Join request for room:', upperCode, 'One-time link:', isOneTimeLink);
        console.log('Available rooms:', Array.from(inMemoryRooms.keys()));
        
        let room = null;
        
        // Try MongoDB first
        try {
          room = await Room.findOne({ code: upperCode });
          console.log('Found room in MongoDB:', room ? 'yes' : 'no');
        } catch (dbError) {
          console.log('MongoDB error:', dbError.message);
        }
        
        // If not found in MongoDB, try in-memory
        if (!room) {
          room = inMemoryRooms.get(upperCode);
          console.log('Found room in memory:', room ? 'yes' : 'no');
        }
        
        // For one-time links, allow the request even if room not found in DB
        // (the room might only exist in creator's localStorage)
        if (!room && isOneTimeLink) {
          console.log('One-time link request - room not found but allowing request');
          // Create a temporary room entry for the request
          room = {
            _id: upperCode,
            code: upperCode,
            name: 'Room ' + upperCode
          };
        }
        
        if (!room) {
          console.log('Room not found anywhere');
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        let requestId;
        try {
          const joinRequest = await JoinRequest.create({
            roomId: room._id || room.code,
            requesterId: socket.id,
            requesterName: userName,
            status: 'pending'
          });
          requestId = joinRequest._id;
        } catch (dbError) {
          // Fallback to in-memory
          requestId = Date.now().toString();
          inMemoryJoinRequests.push({
            _id: requestId,
            roomId: room._id || room.code,
            requesterId: socket.id,
            requesterName: userName,
            status: 'pending'
          });
        }

        console.log('Broadcasting join_request_received to room:', upperCode);
        console.log('Socket rooms:', Array.from(socket.rooms));
        io.to(upperCode).emit('join_request_received', {
          requestId: requestId,
          requesterId: socket.id,
          requesterName: userName,
          userName: userName
        });

        socket.emit('join_request_sent', { requestId });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('approve_join', async (data) => {
      try {
        const { requestId, requesterId, roomCode, requesterName } = data;
        const upperCode = roomCode.toUpperCase();
        
        // Update join request status
        try {
          await JoinRequest.findByIdAndUpdate(requestId, { status: 'approved' });
        } catch (dbError) {
          console.log('Could not update join request in MongoDB');
        }
        
        // Find room - try MongoDB first, then in-memory
        let room = null;
        try {
          room = await Room.findOne({ code: upperCode });
        } catch (dbError) {
          console.log('MongoDB error, using in-memory');
        }
        
        if (!room) {
          room = inMemoryRooms.get(upperCode);
        }
        
        if (room) {
          // Notify User B (the requester) - redirect them to chat
          io.to(requesterId).emit('join_approved', {
            roomId: room._id || room.code,
            roomCode: upperCode,
            roomName: room.name
          });
          
          // Notify User A (the host) - redirect them to chat too
          socket.emit('join_approved_notification', {
            requesterId,
            requesterName
          });
        } else {
          socket.emit('error', { message: 'Room not found for approval' });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('reject_join', async (data) => {
      try {
        const { requestId, requesterId } = data;
        
        await JoinRequest.findByIdAndUpdate(requestId, { status: 'rejected' });
        
        io.to(requesterId).emit('join_rejected', {
          message: 'Your join request was rejected by the host'
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('join_room', async (data) => {
      try {
        const { roomCode, userName, isHost } = data;
        
        socket.join(roomCode);
        activeUsers.set(socket.id, { roomCode, userName, isHost });
        
        const room = await Room.findOne({ code: roomCode });
        
        if (room && !isHost) {
          room.participants.push({ socketId: socket.id, name: userName });
          await room.save();
        }
        
        socket.to(roomCode).emit('user_joined', {
          socketId: socket.id,
          userName,
          isHost: isHost || false
        });
        
        socket.emit('joined_room', { roomCode, roomId: room?._id });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('send_message', async (data) => {
      try {
        const { roomId, roomCode, senderId, senderName, content, type, fileUrl, fileName } = data;
        
        let message;
        try {
          message = await Message.create({
            roomId,
            senderId,
            senderName,
            content,
            type: type || 'text',
            fileUrl,
            fileName
          });
        } catch (dbError) {
          // Fallback to in-memory
          message = {
            _id: Date.now().toString(),
            roomId,
            senderId,
            senderName,
            content,
            type: type || 'text',
            fileUrl,
            fileName,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          const roomMessages = inMemoryMessages.get(roomId) || [];
          roomMessages.push(message);
          inMemoryMessages.set(roomId, roomMessages);
        }
        
        io.to(roomCode).emit('new_message', message);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('typing', (data) => {
      const { roomCode, userName, isTyping } = data;
      socket.to(roomCode).emit('user_typing', { userName, isTyping });
    });

    socket.on('security_settings_changed', (data) => {
      const { roomCode, userName, message, timestamp } = data;
      const upperCode = roomCode.toUpperCase();
      
      // Create a system message that will be broadcast to all users
      const systemMessage = {
        _id: `security_${Date.now()}`,
        roomId: upperCode,
        senderId: 'system',
        senderName: 'System',
        content: message,
        type: 'system',
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      // Broadcast to ALL users in the room (including sender)
      io.to(upperCode).emit('new_message', systemMessage);
    });

    // Handle security settings broadcast to all room members
    socket.on('security_settings_broadcast', (data) => {
      const { roomCode, settings, timestamp } = data;
      const upperCode = roomCode.toUpperCase();
      
      console.log(`Broadcasting security settings to room ${upperCode}`);
      
      // Broadcast to ALL users in the room (including sender)
      io.to(upperCode).emit('security_settings_broadcast', {
        roomCode: upperCode,
        settings,
        timestamp
      });
    });

    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);
      
      const user = activeUsers.get(socket.id);
      
      if (user) {
        socket.to(user.roomCode).emit('user_left', {
          socketId: socket.id,
          userName: user.userName
        });
        
        const room = await Room.findOne({ code: user.roomCode });
        if (room) {
          room.participants = room.participants.filter(p => p.socketId !== socket.id);
          await room.save();
        }
        
        activeUsers.delete(socket.id);
      }
    });
  });
};

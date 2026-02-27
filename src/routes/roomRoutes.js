const express = require('express');
const { Room } = require('../models/Room.js');
const { Message } = require('../models/Message.js');
const { inMemoryRooms, inMemoryMessages } = require('../utils/memoryStore.js');

const router = express.Router();

router.post('/create', async (req, res) => {
  try {
    const { name, code, hostId, hostName } = req.body;
    const upperCode = code.toUpperCase();
    
    const roomData = {
      _id: Date.now().toString(),
      name,
      code: upperCode,
      hostId,
      hostName,
      participants: [{ socketId: hostId, name: hostName }],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Try MongoDB first, fallback to memory
    try {
      const room = await Room.create({
        name,
        code: upperCode,
        hostId,
        hostName,
        participants: [{ socketId: hostId, name: hostName }]
      });
      res.status(201).json({ success: true, room });
    } catch (dbError) {
      console.log('MongoDB not available, using in-memory storage');
      inMemoryRooms.set(upperCode, roomData);
      res.status(201).json({ success: true, room: roomData });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:code', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    
    // Try MongoDB first, fallback to memory
    try {
      const room = await Room.findOne({ code });
      if (room) {
        return res.json({ success: true, room });
      }
    } catch (dbError) {
      console.log('MongoDB not available, checking in-memory storage');
    }
    
    // Check in-memory
    const memoryRoom = inMemoryRooms.get(code);
    if (memoryRoom) {
      return res.json({ success: true, room: memoryRoom });
    }
    
    return res.status(404).json({ success: false, error: 'Room not found' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:roomId/messages', async (req, res) => {
  try {
    // Try MongoDB first, fallback to memory
    try {
      const messages = await Message.find({ roomId: req.params.roomId })
        .sort({ createdAt: 1 })
        .limit(100);
      return res.json({ success: true, messages });
    } catch (dbError) {
      console.log('MongoDB not available, using in-memory storage');
      const messages = inMemoryMessages.get(req.params.roomId) || [];
      return res.json({ success: true, messages });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

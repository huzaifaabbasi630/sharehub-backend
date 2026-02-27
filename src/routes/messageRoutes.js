import express from 'express';
import { Message } from '../models/Message.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { roomId, senderId, senderName, content, type, fileUrl, fileName } = req.body;
    
    const message = await Message.create({
      roomId,
      senderId,
      senderName,
      content,
      type,
      fileUrl,
      fileName
    });
    
    res.status(201).json({ success: true, message });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:messageId/read', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const message = await Message.findByIdAndUpdate(
      req.params.messageId,
      { $push: { readBy: { userId, readAt: new Date() } } },
      { new: true }
    );
    
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

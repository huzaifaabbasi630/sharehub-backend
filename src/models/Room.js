const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  hostId: {
    type: String,
    required: true
  },
  hostName: {
    type: String,
    required: true
  },
  participants: [{
    socketId: String,
    name: String,
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Room = mongoose.model('Room', roomSchema);

module.exports = { Room };

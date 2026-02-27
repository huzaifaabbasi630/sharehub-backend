const mongoose = require('mongoose');

const joinRequestSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  requesterId: {
    type: String,
    required: true
  },
  requesterName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

const JoinRequest = mongoose.model('JoinRequest', joinRequestSchema);

module.exports = { JoinRequest };

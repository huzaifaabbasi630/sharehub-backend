const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  callerId: {
    type: String,
    required: true
  },
  callerName: {
    type: String,
    required: true
  },
  callType: {
    type: String,
    enum: ['video', 'voice'],
    required: true
  },
  participants: [{
    userId: String,
    name: String,
    joinedAt: Date,
    leftAt: Date
  }],
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date,
    default: null
  },
  duration: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const CallLog = mongoose.model('CallLog', callLogSchema);

module.exports = { CallLog };

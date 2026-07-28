const mongoose = require('mongoose');

const callHistorySchema = new mongoose.Schema({
  caller: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  receiver: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  room: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Room' 
  },
  type: { 
    type: String, 
    enum: ['voice', 'video'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['missed', 'rejected', 'completed', 'ongoing'], 
    default: 'ongoing' 
  },
  startTime: { 
    type: Date, 
    default: Date.now 
  },
  endTime: { 
    type: Date 
  },
  duration: { 
    type: Number, 
    default: 0 // in seconds
  }
}, { timestamps: true });

callHistorySchema.index({ room: 1, createdAt: -1 });
callHistorySchema.index({ caller: 1, receiver: 1 });

module.exports = mongoose.model('CallHistory', callHistorySchema);

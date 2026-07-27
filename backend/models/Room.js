const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true
    },
    code: {
      type: String,
      required: [true, 'Room code is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['General', 'Tech', 'Gaming', 'Music', 'Random', 'Custom'],
      default: 'General'
    },
    description: {
      type: String,
      default: ''
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    timestamps: true
  }
);

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;

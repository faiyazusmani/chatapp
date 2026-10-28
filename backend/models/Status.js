const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['image', 'video'],
      default: 'image'
    },
    // Optional photo or video caption
    content: {
      type: String,
      trim: true,
      maxlength: 600,
      default: ''
    },
    // Personal photo or video media URL (required)
    mediaUrl: {
      type: String,
      required: true,
      trim: true
    },
    duration: {
      type: Number,
      default: 0
    },
    // List of users who have viewed this status
    viewers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        viewedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    // 24-hour expiration like WhatsApp
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index: { expires: '24h' }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Status', statusSchema);

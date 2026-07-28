const CallHistory = require('../models/CallHistory');

// @desc    Get user's call history
// @route   GET /api/calls
// @access  Private
const getCallHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    const calls = await CallHistory.find({
      $or: [{ caller: userId }, { receiver: userId }]
    })
    .populate('caller', 'username avatar email')
    .populate('receiver', 'username avatar email')
    .populate('room', 'name')
    .sort({ createdAt: -1 })
    .limit(50); // get last 50 calls for performance

    res.json(calls);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCallHistory
};

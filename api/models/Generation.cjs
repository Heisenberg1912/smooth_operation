const mongoose = require('mongoose');

const generationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['site-analysis', 'masterplan', 'floor-plan', 'material-search', 'project'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    default: null
  },
  input: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  result: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'completed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

generationSchema.index({ userId: 1, createdAt: -1 });
generationSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Generation', generationSchema);

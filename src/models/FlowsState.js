const mongoose = require('mongoose');

const flowsStateSchema = new mongoose.Schema({
  flowToken: { type: String, required: true, unique: true },
  screen: { type: String, required: true },
  data: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 60 * 1000) } // 30 minute timeout
});

module.exports = mongoose.model("FlowsState", flowsStateSchema);
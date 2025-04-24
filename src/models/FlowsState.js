import mongoose from "mongoose";

const flowsStateSchema = new mongoose.Schema({
  flowToken: { type: String, required: true, unique: true },
  screen: { type: String, required: true },
  data: { type: Object, default: {} },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("FlowsState", flowsStateSchema);
import mongoose from 'mongoose';

const AreaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  coordinates: { type: [[Number]], required: true },
  userId: { type: String, required: true },
});

export default mongoose.models.Area || mongoose.model('Area', AreaSchema);
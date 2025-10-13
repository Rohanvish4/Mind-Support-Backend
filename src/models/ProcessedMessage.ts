import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProcessedMessage extends Document {
  messageId: string;
  processedAt: Date;
}

const processedMessageSchema = new Schema<IProcessedMessage>({
  messageId: {
    type: String,
    required: true,
    unique: true,
  },
  processedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

// Indexes
processedMessageSchema.index({ messageId: 1 });
processedMessageSchema.index({ processedAt: 1 }, { expireAfterSeconds: 604800 }); // 7 days TTL

export const ProcessedMessage: Model<IProcessedMessage> = mongoose.model<IProcessedMessage>('ProcessedMessage', processedMessageSchema);
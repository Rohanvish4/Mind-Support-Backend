import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IModerationQueue extends Document {
  payload: any;
  reasonTags: string[];
  severity: number;
  processed: boolean;
  processedAt?: Date;
  createdAt: Date;
}

const moderationQueueSchema = new Schema<IModerationQueue>({
  payload: {
    type: Schema.Types.Mixed,
    required: true,
  },
  reasonTags: [{
    type: String,
    trim: true,
  }],
  severity: {
    type: Number,
    required: true,
    min: 0,
    max: 3,
    default: 0,
  },
  processed: {
    type: Boolean,
    default: false,
  },
  processedAt: { type: Date },
}, {
  timestamps: true,
});

// Indexes
moderationQueueSchema.index({ processed: 1, createdAt: -1 });
moderationQueueSchema.index({ severity: -1, createdAt: -1 });

export const ModerationQueue: Model<IModerationQueue> = mongoose.model<IModerationQueue>('ModerationQueue', moderationQueueSchema);
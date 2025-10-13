import mongoose, { Schema, Document, Model } from 'mongoose';
import { TipType } from '../types';

export interface IDailyTip extends Document {
  id: string; // YYYYMMDD format
  content: string;
  type: TipType;
  publishedAt: Date;
  publishedBy: string;
}

const dailyTipSchema = new Schema<IDailyTip>({
  id: {
    type: String,
    required: true,
    unique: true,
    match: /^\d{8}$/,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: Object.values(TipType),
    default: TipType.TEXT,
  },
  publishedAt: {
    type: Date,
    default: Date.now,
  },
  publishedBy: {
    type: String,
    required: true,
  },
}, {
  timestamps: false,
});

// Indexes
dailyTipSchema.index({ id: 1 });
dailyTipSchema.index({ publishedAt: -1 });

export const DailyTip: Model<IDailyTip> = mongoose.model<IDailyTip>('DailyTip', dailyTipSchema);
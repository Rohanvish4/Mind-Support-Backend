import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMetricsMessagesDaily extends Document {
  day: string; // YYYY-MM-DD
  count: number;
}

const metricsMessagesDailySchema = new Schema<IMetricsMessagesDaily>({
  day: {
    type: String,
    required: true,
    unique: true,
    match: /^\d{4}-\d{2}-\d{2}$/,
  },
  count: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: false,
});

// Indexes
metricsMessagesDailySchema.index({ day: -1 });

export const MetricsMessagesDaily: Model<IMetricsMessagesDaily> = mongoose.model<IMetricsMessagesDaily>('MetricsMessagesDaily', metricsMessagesDailySchema);
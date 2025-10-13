import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { ReportTargetType, ReportStatus } from '../types';

export interface IReport extends Document {
  reporterUserId?: Types.ObjectId;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  status: ReportStatus;
  moderatorId?: Types.ObjectId;
  moderatorComment?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

const reportSchema = new Schema<IReport>({
  reporterUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  targetType: {
    type: String,
    enum: Object.values(ReportTargetType),
    required: true,
  },
  targetId: {
    type: String,
    required: true,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  status: {
    type: String,
    enum: Object.values(ReportStatus),
    default: ReportStatus.OPEN,
  },
  moderatorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  moderatorComment: {
    type: String,
    trim: true,
    maxlength: 2000,
  },
  resolvedAt: { type: Date },
}, {
  timestamps: true,
});

// Indexes
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });
reportSchema.index({ reporterUserId: 1 });

export const Report: Model<IReport> = mongoose.model<IReport>('Report', reportSchema);
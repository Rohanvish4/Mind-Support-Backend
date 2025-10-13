import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { AuditLogMeta } from '../types';

export interface IAuditLog extends Document {
  action: string;
  actorUserId?: Types.ObjectId;
  target?: string;
  timestamp: Date;
  meta: AuditLogMeta;
}

const auditLogSchema = new Schema<IAuditLog>({
  action: {
    type: String,
    required: true,
    trim: true,
  },
  actorUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  target: { type: String },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  meta: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: false,
});

// Indexes
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ actorUserId: 1, timestamp: -1 });

export const AuditLog: Model<IAuditLog> = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
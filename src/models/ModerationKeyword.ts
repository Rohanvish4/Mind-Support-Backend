import mongoose, { Schema, Document, Model } from 'mongoose';
import { KeywordSeverity, KeywordAction } from '../types';

export interface IModerationKeyword extends Document {
  word: string;
  severity: KeywordSeverity;
  action: KeywordAction;
  isRegex: boolean;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const moderationKeywordSchema = new Schema<IModerationKeyword>({
  word: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  severity: {
    type: String,
    enum: Object.values(KeywordSeverity),
    required: true,
  },
  action: {
    type: String,
    enum: Object.values(KeywordAction),
    required: true,
  },
  isRegex: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
moderationKeywordSchema.index({ word: 1, enabled: 1 });
moderationKeywordSchema.index({ severity: 1 });

export const ModerationKeyword: Model<IModerationKeyword> = mongoose.model<IModerationKeyword>('ModerationKeyword', moderationKeywordSchema);
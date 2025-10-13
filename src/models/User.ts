import mongoose, { Schema, Document, Model } from 'mongoose';
import { UserRole, AnonymousHandle } from '../types';

export interface IUser extends Document {
  email?: string;
  passwordHash?: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  isCounselor: boolean;
  tags: string[];
  anonymousHandles: AnonymousHandle[];
  bannedUntil?: Date;
  createdAt: Date;
  lastSeenAt: Date;
  
  // Virtual methods
  isBanned(): boolean;
}

const anonymousHandleSchema = new Schema<AnonymousHandle>({
  channelId: { type: String, required: true },
  handle: { type: String, required: true },
  ephemeralId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: { type: String },
  displayName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  avatarUrl: { type: String },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.USER,
  },
  isCounselor: {
    type: Boolean,
    default: false,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  anonymousHandles: [anonymousHandleSchema],
  bannedUntil: { type: Date },
  lastSeenAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      if (ret) {
        delete ret.passwordHash;
        if ('__v' in ret) delete (ret as any)['__v'];
      }
      return ret;
    },
  },
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ bannedUntil: 1 });

// Instance methods
userSchema.methods.isBanned = function(): boolean {
  if (!this.bannedUntil) return false;
  return new Date() < this.bannedUntil;
};

export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
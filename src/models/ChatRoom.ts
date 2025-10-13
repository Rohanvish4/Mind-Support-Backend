import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IChatRoom extends Document {
  streamChannelId: string;
  title: string;
  isPrivate: boolean;
  isGroup: boolean;
  tags: string[];
  createdBy: Types.ObjectId;
  members: Map<string, {
    role: 'member' | 'moderator' | 'owner';
    joinedAt: Date;
  }>;
  lastMessageAt?: Date;
  flaggedCount: number;
  createdAt: Date;
}

const chatRoomSchema = new Schema<IChatRoom>({
  streamChannelId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
  isGroup: {
    type: Boolean,
    default: false,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: {
    type: Map,
    of: new Schema({
      role: {
        type: String,
        enum: ['member', 'moderator', 'owner'],
        default: 'member',
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
    }, { _id: false }),
    default: new Map(),
  },
  lastMessageAt: { type: Date },
  flaggedCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Indexes
chatRoomSchema.index({ streamChannelId: 1 });
chatRoomSchema.index({ createdBy: 1 });
chatRoomSchema.index({ tags: 1 });

export const ChatRoom: Model<IChatRoom> = mongoose.model<IChatRoom>('ChatRoom', chatRoomSchema);
import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IEphemeralMapping extends Document {
  ephemeralId: string;
  realUserId: Types.ObjectId;
  channelId: string;
  expiresAt: Date;
  createdAt: Date;
}

const ephemeralMappingSchema = new Schema<IEphemeralMapping>({
  ephemeralId: {
    type: String,
    required: true,
    unique: true,
  },
  realUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  channelId: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
ephemeralMappingSchema.index({ ephemeralId: 1 });
ephemeralMappingSchema.index({ realUserId: 1, channelId: 1 });
ephemeralMappingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

export const EphemeralMapping: Model<IEphemeralMapping> = mongoose.model<IEphemeralMapping>('EphemeralMapping', ephemeralMappingSchema);
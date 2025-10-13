import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { streamClient } from '../services/streamClient';
import { User } from '../models/User';
import { ChatRoom } from '../models/ChatRoom';
import { EphemeralMapping } from '../models/EphemeralMapping';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { nanoid } from 'nanoid';

/**
 * Generate Stream token for authenticated user
 */
export const getStreamToken = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { anonymousHandle } = req.body;

  // Fetch user
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (user.isBanned()) {
    throw new AppError('User is banned', 403, 'USER_BANNED', {
      bannedUntil: user.bannedUntil,
    });
  }

  let token: string;
  let ephemeralData: any = null;

  if (anonymousHandle) {
    // Create ephemeral identity
    const ephemeralId = `anon_${userId}_${nanoid(8)}`;
    
    // Upsert ephemeral user in Stream
    await streamClient.upsertUser(ephemeralId, {
      name: anonymousHandle,
      role: 'anonymous',
      isAnonymous: true,
    });

    // Create ephemeral token
    token = streamClient.createToken(ephemeralId);

    // Store mapping
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

    await EphemeralMapping.create({
      ephemeralId,
      realUserId: user._id,
      channelId: 'pending', // Will be updated when joining channel
      expiresAt,
    });

    // Add to user's anonymous handles
    user.anonymousHandles.push({
      channelId: 'pending',
      handle: anonymousHandle,
      ephemeralId,
      createdAt: new Date(),
    });
    await user.save();

    ephemeralData = {
      id: ephemeralId,
      token,
      handle: anonymousHandle,
      expiresAt,
    };

    logger.info(`Ephemeral identity created for user ${userId}: ${ephemeralId}`);
  } else {
    // Regular user identity
    await streamClient.upsertUser(userId, {
      name: user.displayName,
      image: user.avatarUrl,
      role: user.role,
    });

    token = streamClient.createToken(userId);
  }

  res.status(200).json({
    success: true,
    data: {
      token: ephemeralData ? ephemeralData.token : token,
      user: {
        id: ephemeralData ? ephemeralData.id : userId,
        displayName: ephemeralData ? ephemeralData.handle : user.displayName,
        avatarUrl: user.avatarUrl,
      },
      ...(ephemeralData && { ephemeral: ephemeralData }),
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Create a new channel
 */
export const createChannel = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { channelId, type = 'messaging', members, extra } = req.body;

  const finalChannelId = channelId || nanoid(16);
  const allMembers = [...new Set([userId, ...members])];

  // Create channel in Stream
  await streamClient.createChannel(
    type,
    finalChannelId,
    userId,
    {
      name: extra?.title || 'New Channel',
      members: allMembers,
      ...extra,
    }
  );

  // Persist in database
  const memberMap = new Map();
  allMembers.forEach((memberId) => {
    memberMap.set(memberId, {
      role: memberId === userId ? 'owner' : 'member',
      joinedAt: new Date(),
    });
  });

  const chatRoom = await ChatRoom.create({
    streamChannelId: `${type}:${finalChannelId}`,
    title: extra?.title || 'New Channel',
    isPrivate: extra?.isPrivate || false,
    isGroup: allMembers.length > 2,
    tags: extra?.tags || [],
    createdBy: userId,
    members: memberMap,
  });

  logger.info(`Channel created: ${chatRoom.streamChannelId} by user ${userId}`);

  res.status(201).json({
    success: true,
    data: {
      channelId: finalChannelId,
      streamChannelId: chatRoom.streamChannelId,
      members: allMembers,
      title: chatRoom.title,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Join an existing channel
 */
export const joinChannel = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { streamChannelId, asAnonymousHandle } = req.body;

  // Parse channel type and id
  const [channelType, channelId] = streamChannelId.split(':');
  if (!channelType || !channelId) {
    throw new AppError('Invalid channel ID format', 400, 'INVALID_CHANNEL_ID');
  }

  let effectiveUserId = userId;

  if (asAnonymousHandle) {
    // Find or create ephemeral identity
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const existingHandle = user.anonymousHandles.find(
      (h) => h.handle === asAnonymousHandle && h.channelId === 'pending'
    );

    if (existingHandle) {
      effectiveUserId = existingHandle.ephemeralId;
      
      // Update mapping with actual channel
      await EphemeralMapping.updateOne(
        { ephemeralId: effectiveUserId },
        { channelId: streamChannelId }
      );
      
      existingHandle.channelId = streamChannelId;
      await user.save();
    } else {
      // Create new ephemeral identity
      const ephemeralId = `anon_${userId}_${nanoid(8)}`;
      await streamClient.upsertUser(ephemeralId, {
        name: asAnonymousHandle,
        role: 'anonymous',
        isAnonymous: true,
      });

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await EphemeralMapping.create({
        ephemeralId,
        realUserId: user._id,
        channelId: streamChannelId,
        expiresAt,
      });

      user.anonymousHandles.push({
        channelId: streamChannelId,
        handle: asAnonymousHandle,
        ephemeralId,
        createdAt: new Date(),
      });
      await user.save();

      effectiveUserId = ephemeralId;
    }
  }

  // Add member to Stream channel
  await streamClient.addMembers(channelType, channelId, [effectiveUserId]);

  // Update database
  const chatRoom = await ChatRoom.findOne({ streamChannelId });
  if (chatRoom) {
    chatRoom.members.set(effectiveUserId, {
      role: 'member',
      joinedAt: new Date(),
    });
    await chatRoom.save();
  }

  logger.info(`User ${effectiveUserId} joined channel ${streamChannelId}`);

  res.status(200).json({
    success: true,
    data: {
      channelId: streamChannelId,
      userId: effectiveUserId,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};
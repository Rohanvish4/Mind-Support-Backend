import { Request } from 'express';

/**
 * User roles in the system
 */
export enum UserRole {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

/**
 * Report target types
 */
export enum ReportTargetType {
  MESSAGE = 'message',
  USER = 'user',
  CHANNEL = 'channel',
  RESOURCE = 'resource',
}

/**
 * Report status
 */
export enum ReportStatus {
  OPEN = 'open',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
}

/**
 * Moderation action types
 */
export enum ModerationAction {
  DISMISS = 'dismiss',
  REMOVE = 'remove',
  BAN_USER = 'banUser',
  SUSPEND_CHANNEL = 'suspendChannel',
}

/**
 * Keyword severity levels
 */
export enum KeywordSeverity {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * Keyword actions
 */
export enum KeywordAction {
  FLAG = 'flag',
  HIDE = 'hide',
  ESCALATE = 'escalate',
  NOTIFY = 'notify',
}

/**
 * Daily tip types
 */
export enum TipType {
  TEXT = 'text',
  ACTIVITY = 'activity',
  IMAGE = 'image',
  VIDEO = 'video',
}

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    email?: string;
    displayName: string;
  };
}

/**
 * JWT Payload
 */
export interface JWTPayload {
  userId: string;
  role: UserRole;
  email?: string;
  type: 'access' | 'refresh';
}

/**
 * Anonymous handle structure
 */
export interface AnonymousHandle {
  channelId: string;
  handle: string;
  ephemeralId: string;
  createdAt: Date;
}

/**
 * Channel member info
 */
export interface ChannelMember {
  userId: string;
  role: 'member' | 'moderator' | 'owner';
  joinedAt: Date;
}

/**
 * Keyword match result
 */
export interface KeywordMatch {
  word: string;
  severity: KeywordSeverity;
  action: KeywordAction;
  position: number;
}

/**
 * Scan result from keyword scanner
 */
export interface ScanResult {
  severity: KeywordSeverity;
  matches: KeywordMatch[];
  severityScore: number;
}

/**
 * Stream webhook event types
 */
export interface StreamWebhookEvent {
  type: string;
  message?: {
    id: string;
    text: string;
    user: {
      id: string;
      name?: string;
    };
    cid: string;
    created_at: string;
  };
  user?: {
    id: string;
    name?: string;
  };
  channel?: {
    id: string;
    type: string;
    cid: string;
  };
  created_at: string;
}

/**
 * Crisis resource structure
 */
export interface CrisisResource {
  name: string;
  phone: string;
  url?: string;
  description: string;
  availability: string;
}

/**
 * Audit log metadata
 */
export interface AuditLogMeta {
  [key: string]: any;
}

/**
 * API Response wrapper
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
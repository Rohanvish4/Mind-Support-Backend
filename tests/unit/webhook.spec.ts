import { handleStreamWebhook } from '../../src/controllers/webhookController';
import { keywordScanner } from '../../src/services/keywordScanner';
import { idempotencyService } from '../../src/services/idempotency';
import { streamClient } from '../../src/services/streamClient';
import { ModerationQueue } from '../../src/models/ModerationQueue';
import { KeywordSeverity } from '../../src/types';
import { connectDatabase, disconnectDatabase } from '../../src/utils/database';

// Mock services
jest.mock('../../src/services/streamClient');
jest.mock('../../src/services/pushService');

describe('Webhook Handler', () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock request and response
    mockRequest = {
      headers: {
        'x-signature': 'valid-signature',
      },
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Mock signature verification
    (streamClient.verifyWebhookSignature as jest.Mock).mockReturnValue(true);
  });

  describe('message.new event', () => {
    it('should process high severity message', async () => {
      const messageEvent = {
        type: 'message.new',
        message: {
          id: 'msg-123',
          text: 'I am thinking about suicide',
          user: { id: 'user-123' },
          cid: 'messaging:channel-123',
          created_at: new Date().toISOString(),
        },
      };

      mockRequest.body = messageEvent;

      // Mock keyword scanner to return high severity
      jest.spyOn(keywordScanner, 'scanText').mockResolvedValue({
        severity: KeywordSeverity.HIGH,
        matches: [
          {
            word: 'suicide',
            severity: KeywordSeverity.HIGH,
            action: 'escalate' as any,
            position: 20,
          },
        ],
        severityScore: 3,
      });

      // Mock idempotency
      jest.spyOn(idempotencyService, 'isProcessed').mockResolvedValue(false);
      jest.spyOn(idempotencyService, 'markProcessed').mockResolvedValue();

      await handleStreamWebhook(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(streamClient.deleteMessage).toHaveBeenCalledWith('msg-123', true);
    });

    it('should process medium severity message', async () => {
      const messageEvent = {
        type: 'message.new',
        message: {
          id: 'msg-456',
          text: 'I feel really depressed',
          user: { id: 'user-456' },
          cid: 'messaging:channel-456',
          created_at: new Date().toISOString(),
        },
      };

      mockRequest.body = messageEvent;

      jest.spyOn(keywordScanner, 'scanText').mockResolvedValue({
        severity: KeywordSeverity.MEDIUM,
        matches: [
          {
            word: 'depressed',
            severity: KeywordSeverity.MEDIUM,
            action: 'flag' as any,
            position: 13,
          },
        ],
        severityScore: 2,
      });

      jest.spyOn(idempotencyService, 'isProcessed').mockResolvedValue(false);
      jest.spyOn(idempotencyService, 'markProcessed').mockResolvedValue();

      await handleStreamWebhook(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(streamClient.flagMessage).toHaveBeenCalled();
    });

    it('should skip already processed messages', async () => {
      const messageEvent = {
        type: 'message.new',
        message: {
          id: 'msg-789',
          text: 'Hello world',
          user: { id: 'user-789' },
          cid: 'messaging:channel-789',
          created_at: new Date().toISOString(),
        },
      };

      mockRequest.body = messageEvent;

      // Mock as already processed
      jest.spyOn(idempotencyService, 'isProcessed').mockResolvedValue(true);

      const scanTextSpy = jest.spyOn(keywordScanner, 'scanText');

      await handleStreamWebhook(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(scanTextSpy).not.toHaveBeenCalled();
    });

    it('should handle clean messages', async () => {
      const messageEvent = {
        type: 'message.new',
        message: {
          id: 'msg-clean',
          text: 'Hello, how are you?',
          user: { id: 'user-clean' },
          cid: 'messaging:channel-clean',
          created_at: new Date().toISOString(),
        },
      };

      mockRequest.body = messageEvent;

      jest.spyOn(keywordScanner, 'scanText').mockResolvedValue({
        severity: KeywordSeverity.NONE,
        matches: [],
        severityScore: 0,
      });

      jest.spyOn(idempotencyService, 'isProcessed').mockResolvedValue(false);
      jest.spyOn(idempotencyService, 'markProcessed').mockResolvedValue();

      await handleStreamWebhook(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(streamClient.deleteMessage).not.toHaveBeenCalled();
    });
  });

  describe('signature verification', () => {
    it('should reject webhook with invalid signature', async () => {
      mockRequest.body = { type: 'message.new' };
      
      (streamClient.verifyWebhookSignature as jest.Mock).mockReturnValue(false);

      await handleStreamWebhook(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should reject webhook without signature', async () => {
      delete mockRequest.headers['x-signature'];
      mockRequest.body = { type: 'message.new' };

      await handleStreamWebhook(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });
});
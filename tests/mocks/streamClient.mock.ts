/**
 * Mock Stream Chat Client for testing
 */
export const mockStreamClient = {
  upsertUser: jest.fn().mockResolvedValue({ users: {} }),
  createToken: jest.fn().mockReturnValue('mock-stream-token'),
  channel: jest.fn().mockReturnValue({
    create: jest.fn().mockResolvedValue({}),
    addMembers: jest.fn().mockResolvedValue({}),
    removeMembers: jest.fn().mockResolvedValue({}),
    sendMessage: jest.fn().mockResolvedValue({}),
  }),
  deleteMessage: jest.fn().mockResolvedValue({}),
  flagMessage: jest.fn().mockResolvedValue({}),
  banUser: jest.fn().mockResolvedValue({}),
  unbanUser: jest.fn().mockResolvedValue({}),
  deactivateUser: jest.fn().mockResolvedValue({}),
  reactivateUser: jest.fn().mockResolvedValue({}),
  verifyWebhook: jest.fn().mockReturnValue(true),
};

/**
 * Factory to create Stream client mock
 */
export const createStreamClientMock = () => {
  return {
    getInstance: jest.fn().mockReturnValue(mockStreamClient),
  };
};
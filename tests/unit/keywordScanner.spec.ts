import { keywordScanner } from '../../src/services/keywordScanner';
import { ModerationKeyword } from '../../src/models/ModerationKeyword';
import { KeywordSeverity, KeywordAction } from '../../src/types';
import { connectDatabase, disconnectDatabase } from '../../src/utils/database';

describe('KeywordScanner Service', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    // Clear keywords collection
    await ModerationKeyword.deleteMany({});
    
    // Seed test keywords
    await ModerationKeyword.create([
      {
        word: 'suicide',
        severity: KeywordSeverity.HIGH,
        action: KeywordAction.ESCALATE,
        enabled: true,
      },
      {
        word: 'kill myself',
        severity: KeywordSeverity.HIGH,
        action: KeywordAction.ESCALATE,
        enabled: true,
      },
      {
        word: 'depressed',
        severity: KeywordSeverity.MEDIUM,
        action: KeywordAction.FLAG,
        enabled: true,
      },
      {
        word: 'stressed',
        severity: KeywordSeverity.LOW,
        action: KeywordAction.FLAG,
        enabled: true,
      },
    ]);

    // Force reload keywords
    await keywordScanner.reloadKeywords();
  });

  describe('scanText', () => {
    it('should detect high severity keywords', async () => {
      const text = 'I am thinking about suicide';
      const result = await keywordScanner.scanText(text);

      expect(result.severity).toBe(KeywordSeverity.HIGH);
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches[0].word).toBe('suicide');
      expect(result.severityScore).toBe(3);
    });

    it('should detect medium severity keywords', async () => {
      const text = 'I feel really depressed today';
      const result = await keywordScanner.scanText(text);

      expect(result.severity).toBe(KeywordSeverity.MEDIUM);
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches[0].word).toBe('depressed');
      expect(result.severityScore).toBe(2);
    });

    it('should detect low severity keywords', async () => {
      const text = 'I am stressed about work';
      const result = await keywordScanner.scanText(text);

      expect(result.severity).toBe(KeywordSeverity.LOW);
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.severityScore).toBe(1);
    });

    it('should return none for clean text', async () => {
      const text = 'Hello, how are you today?';
      const result = await keywordScanner.scanText(text);

      expect(result.severity).toBe(KeywordSeverity.NONE);
      expect(result.matches.length).toBe(0);
      expect(result.severityScore).toBe(0);
    });

    it('should handle empty text', async () => {
      const result = await keywordScanner.scanText('');

      expect(result.severity).toBe(KeywordSeverity.NONE);
      expect(result.matches.length).toBe(0);
    });

    it('should detect multiple keywords', async () => {
      const text = 'I am depressed and stressed';
      const result = await keywordScanner.scanText(text);

      expect(result.severity).toBe(KeywordSeverity.MEDIUM); // Highest severity
      expect(result.matches.length).toBe(2);
    });

    it('should handle case insensitivity', async () => {
      const text = 'I am thinking about SUICIDE';
      const result = await keywordScanner.scanText(text);

      expect(result.severity).toBe(KeywordSeverity.HIGH);
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it('should handle punctuation', async () => {
      const text = 'I am thinking about suicide!!!';
      const result = await keywordScanner.scanText(text);

      expect(result.severity).toBe(KeywordSeverity.HIGH);
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it('should detect phrase keywords', async () => {
      const text = 'I want to kill myself';
      const result = await keywordScanner.scanText(text);

      expect(result.severity).toBe(KeywordSeverity.HIGH);
      expect(result.matches.some(m => m.word === 'kill myself')).toBe(true);
    });
  });

  describe('cache management', () => {
    it('should cache keywords', async () => {
      const text = 'I am depressed';
      
      // First call loads from DB
      const result1 = await keywordScanner.scanText(text);
      
      // Second call uses cache
      const result2 = await keywordScanner.scanText(text);

      expect(result1.severity).toBe(result2.severity);
    });

    it('should reload keywords on demand', async () => {
      await keywordScanner.reloadKeywords();
      
      const text = 'I am depressed';
      const result = await keywordScanner.scanText(text);

      expect(result.severity).toBe(KeywordSeverity.MEDIUM);
    });

    it('should clear cache', () => {
      keywordScanner.clearCache();
      // Cache is cleared, next scan will reload from DB
    });
  });
});
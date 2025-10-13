import { ModerationKeyword, IModerationKeyword } from '../models/ModerationKeyword';
import { KeywordSeverity, KeywordMatch, ScanResult } from '../types';
import { logger } from '../utils/logger';

/**
 * Keyword Scanner Service
 * Scans text for moderation keywords with in-memory caching
 */
class KeywordScannerService {
  private cache: IModerationKeyword[] = [];
  private lastCacheUpdate: Date | null = null;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes in milliseconds

  /**
   * Load keywords from database with caching
   */
  private async loadKeywords(force: boolean = false): Promise<IModerationKeyword[]> {
    const now = new Date();
    
    // Check if cache is valid
    if (
      !force &&
      this.cache.length > 0 &&
      this.lastCacheUpdate &&
      (now.getTime() - this.lastCacheUpdate.getTime()) < this.cacheTTL
    ) {
      return this.cache;
    }

    try {
      // Fetch enabled keywords from database
      const keywords = await ModerationKeyword.find({ enabled: true });
      this.cache = keywords;
      this.lastCacheUpdate = now;
      logger.info(`✅ Loaded ${keywords.length} moderation keywords into cache`);
      return keywords;
    } catch (error) {
      logger.error('Error loading moderation keywords:', error);
      // Return cached data if available, even if stale
      return this.cache;
    }
  }

  /**
   * Normalize text for scanning
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();
  }

  /**
   * Calculate severity score from severity level
   */
  private getSeverityScore(severity: KeywordSeverity): number {
    const scores = {
      [KeywordSeverity.NONE]: 0,
      [KeywordSeverity.LOW]: 1,
      [KeywordSeverity.MEDIUM]: 2,
      [KeywordSeverity.HIGH]: 3,
    };
    return scores[severity] || 0;
  }

  /**
   * Scan text for keywords
   */
  async scanText(text: string): Promise<ScanResult> {
    if (!text || text.trim().length === 0) {
      return {
        severity: KeywordSeverity.NONE,
        matches: [],
        severityScore: 0,
      };
    }

    const keywords = await this.loadKeywords();
    const normalizedText = this.normalizeText(text);
    const matches: KeywordMatch[] = [];
    let highestSeverity = KeywordSeverity.NONE;
    let highestScore = 0;

    for (const keyword of keywords) {
      try {
        let found = false;
        let position = -1;

        if (keyword.isRegex) {
          // Handle regex patterns
          const regex = new RegExp(keyword.word, 'gi');
          const match = regex.exec(normalizedText);
          if (match) {
            found = true;
            position = match.index;
          }
        } else {
          // Simple substring match with word boundaries
          const pattern = `\\b${keyword.word}\\b`;
          const regex = new RegExp(pattern, 'i');
          const match = regex.exec(normalizedText);
          if (match) {
            found = true;
            position = match.index;
          }
        }

        if (found) {
          matches.push({
            word: keyword.word,
            severity: keyword.severity,
            action: keyword.action,
            position,
          });

          // Update highest severity
          const score = this.getSeverityScore(keyword.severity);
          if (score > highestScore) {
            highestScore = score;
            highestSeverity = keyword.severity;
          }
        }
      } catch (error) {
        logger.error(`Error processing keyword "${keyword.word}":`, error);
        // Continue with other keywords
      }
    }

    // Sort matches by position
    matches.sort((a, b) => a.position - b.position);

    logger.debug(`Scanned text, found ${matches.length} matches, severity: ${highestSeverity}`);

    return {
      severity: highestSeverity,
      matches,
      severityScore: highestScore,
    };
  }

  /**
   * Force reload keywords from database
   */
  async reloadKeywords(): Promise<void> {
    await this.loadKeywords(true);
    logger.info('Keyword cache reloaded');
  }

  /**
   * Clear keyword cache
   */
  clearCache(): void {
    this.cache = [];
    this.lastCacheUpdate = null;
    logger.info('Keyword cache cleared');
  }
}

// Export singleton instance
export const keywordScanner = new KeywordScannerService();
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ModerationKeyword } from '../src/models/ModerationKeyword';
import { KeywordSeverity, KeywordAction } from '../src/types';
import { logger } from '../src/utils/logger';

dotenv.config();

/**
 * Seed moderation keywords for testing and initial setup
 */
const keywords = [
  // High severity - crisis/self-harm
  { word: 'suicide', severity: KeywordSeverity.HIGH, action: KeywordAction.ESCALATE },
  { word: 'kill myself', severity: KeywordSeverity.HIGH, action: KeywordAction.ESCALATE },
  { word: 'end it all', severity: KeywordSeverity.HIGH, action: KeywordAction.ESCALATE },
  { word: 'self harm', severity: KeywordSeverity.HIGH, action: KeywordAction.ESCALATE },
  { word: 'cutting myself', severity: KeywordSeverity.HIGH, action: KeywordAction.ESCALATE },
  { word: 'want to die', severity: KeywordSeverity.HIGH, action: KeywordAction.ESCALATE },
  { word: 'better off dead', severity: KeywordSeverity.HIGH, action: KeywordAction.ESCALATE },
  
  // Medium severity - concerning language
  { word: 'depressed', severity: KeywordSeverity.MEDIUM, action: KeywordAction.FLAG },
  { word: 'hopeless', severity: KeywordSeverity.MEDIUM, action: KeywordAction.FLAG },
  { word: 'worthless', severity: KeywordSeverity.MEDIUM, action: KeywordAction.FLAG },
  { word: 'anxiety attack', severity: KeywordSeverity.MEDIUM, action: KeywordAction.FLAG },
  { word: 'panic attack', severity: KeywordSeverity.MEDIUM, action: KeywordAction.FLAG },
  { word: 'cant cope', severity: KeywordSeverity.MEDIUM, action: KeywordAction.FLAG },
  { word: 'give up', severity: KeywordSeverity.MEDIUM, action: KeywordAction.FLAG },
  
  // Low severity - monitor
  { word: 'stressed', severity: KeywordSeverity.LOW, action: KeywordAction.FLAG },
  { word: 'overwhelmed', severity: KeywordSeverity.LOW, action: KeywordAction.FLAG },
  { word: 'sad', severity: KeywordSeverity.LOW, action: KeywordAction.FLAG },
  { word: 'lonely', severity: KeywordSeverity.LOW, action: KeywordAction.FLAG },
  { word: 'tired of life', severity: KeywordSeverity.LOW, action: KeywordAction.FLAG },
  
  // Abusive language - high severity
  { word: 'kys', severity: KeywordSeverity.HIGH, action: KeywordAction.HIDE },
  { word: 'kill yourself', severity: KeywordSeverity.HIGH, action: KeywordAction.HIDE },
];

async function seedKeywords() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not set in environment');
    }

    await mongoose.connect(mongoUri);
    logger.info('✅ Connected to MongoDB');

    // Clear existing keywords
    await ModerationKeyword.deleteMany({});
    logger.info('🗑️  Cleared existing keywords');

    // Insert new keywords
    const inserted = await ModerationKeyword.insertMany(
      keywords.map(k => ({ ...k, enabled: true }))
    );

    logger.info(`✅ Seeded ${inserted.length} moderation keywords`);

    // Display summary
    const summary = {
      high: inserted.filter(k => k.severity === KeywordSeverity.HIGH).length,
      medium: inserted.filter(k => k.severity === KeywordSeverity.MEDIUM).length,
      low: inserted.filter(k => k.severity === KeywordSeverity.LOW).length,
    };

    logger.info('📊 Summary:', summary);

    await mongoose.disconnect();
    logger.info('✅ Database disconnected');
  } catch (error) {
    logger.error('❌ Error seeding keywords:', error);
    process.exit(1);
  }
}

// Run seed script
seedKeywords();
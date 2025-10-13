/**
 * Vercel Serverless Function Entry Point
 * This file adapts the Express app to work with Vercel's serverless architecture
 */
import { app } from './index';

export default async (req: any, res: any) => {
  return app(req, res);
};
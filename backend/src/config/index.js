import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.resolve(__dirname, '../../data/pchclk.db'),
  jwtSecret: process.env.JWT_SECRET || 'dev-local-secret-for-pchclk-system-2026',
  globalStartDay: parseInt(process.env.GLOBAL_START_DAY || '20', 10),
};

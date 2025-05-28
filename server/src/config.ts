import dotenv from 'dotenv';

dotenv.config();

export const config = {
  DATABASE_URL: process.env.DATABASE_URL!,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
  PORT: parseInt(process.env.PORT || '3008'),
  WS_PORT: parseInt(process.env.WS_PORT || '3010')
}; 
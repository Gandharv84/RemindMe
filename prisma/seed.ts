import 'dotenv/config';
import { db } from '../server/db';
import { disconnectPrisma } from '../server/prismaStore';

try {
  await db.initialize();
} finally {
  await disconnectPrisma();
}

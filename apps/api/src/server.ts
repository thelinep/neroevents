import 'dotenv/config';

import { buildApp } from './app.js';
import { config } from './config.js';
import { runMigrations } from './db/migrate.js';
import { orchestrator } from './orchestrator.js';

const PORT = Number(process.env.PORT || 3000);
const HOST = config.host;

async function start(): Promise<void> {
  await runMigrations();
  await orchestrator.initialize();

  const app = buildApp();

  await app.listen({
    port: PORT,
    host: HOST,
  });

  console.log(`✅ Builder SPA running at http://${HOST}:${PORT}`);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
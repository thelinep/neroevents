import 'dotenv/config';

import { config } from './config.js';
import { runMigrations } from './db/migrate.js';
import { orchestrator } from './orchestrator.js';
import { buildApp } from './app.js';

const app = buildApp();

const start = async () => {
  try {
    await runMigrations();
    await orchestrator.initialize();

    await app.listen({
      port: config.port,
      host: config.host,
    });

    console.log(
      `✅ Builder API running at http://${config.host}:${config.port}`,
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
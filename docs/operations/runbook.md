# Development Runbook

1. Copy `.env.example` to a local environment file outside source control.
2. Start the integrated stack with `docker compose up --build`.
3. Check `http://localhost:3000/health`.
4. Check `http://localhost:3000/ready`.
5. Open `http://localhost:3001/login`.
6. Run `pnpm test:e2e` after Playwright environment setup.

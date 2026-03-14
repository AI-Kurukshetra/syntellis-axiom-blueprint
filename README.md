# Healthcare Intelligence Hub

Initial project scaffold for the Healthcare Intelligence Hub defined in `.codex/skills/project-requirement.md`.

This setup uses:

- Next.js with App Router.
- TypeScript.
- Supabase for backend services, auth, and PostgreSQL.
- Vercel-ready deployment structure.

## Project Structure

```text
.
|-- .env.example
|-- .eslintrc.json
|-- middleware.ts
|-- next.config.ts
|-- package.json
|-- tsconfig.json
`-- src
    |-- app
    |   |-- (auth)
    |   |-- (protected)
    |   `-- api
    |-- components
    |-- config
    |-- features
    |-- lib
    `-- types
```

## Main Modules

- Authentication and tenant-aware access control
- Dashboards and scorecards
- Analytics and KPI management
- Reports and exports
- Alerts and notifications
- Compliance and audit
- Integrations and data sources
- Administration and configuration

## Environment Variables

Copy `.env.example` to `.env.local` and provide values for:

- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Useful Commands

```bash
npm run lint
npm run typecheck
npm run build
```

## Notes

- Business logic is intentionally not implemented yet.
- API routes, services, and pages are placeholders aligned to the SRS.
- Supabase auth/session middleware is wired for future protected routes.

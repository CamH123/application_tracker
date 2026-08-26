# Job Tracker

A local-first tracker for Applications and their recruiting timelines. Manual tracking is authoritative. Optional Gmail synchronization uses a local Ollama model to create editable Inbox Items; it never changes Applications until an item is accepted.

## Prerequisites

- Node.js 22 or newer
- Docker with Compose (for PostgreSQL)
- [Ollama](https://ollama.com/) for Gmail synchronization only

## Install and run

```bash
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
openssl rand -hex 32
```

Put the generated 64-character value in `server/.env` as `TOKEN_ENCRYPTION_KEY`. If you want Gmail sync, install its fixed model:

```bash
ollama pull llama3.2:3b
```

From the repository root, the single development start command starts PostgreSQL, applies migrations, and launches the API and client:

```bash
npm run local:start
```

Open <http://localhost:5173>. Stop the processes with Ctrl-C and stop PostgreSQL with `npm run local:stop`.

## Google OAuth

Gmail is optional; all manual features work without it.

1. Create a project in Google Cloud Console and enable the Gmail API.
2. Configure an OAuth consent screen for a desktop/local testing user.
3. Create a Web application OAuth client with `http://localhost:3001/api/gmail/oauth/callback` as an authorized redirect URI.
4. Put the client ID and secret in `server/.env`.
5. Use **Connect Gmail read-only** in Settings. The app requests only `gmail.readonly` and stores the refresh token encrypted.
6. Choose an inclusive initial Gmail Sync Window in Settings. Only after that succeeds will application startup trigger incremental synchronization.

Source messages are retrieved from Gmail only when requested in Inbox review and are never persisted.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Run integration tests against a disposable PostgreSQL container:

```bash
npm run test:integration:local
```

## Data backup and restore

Create a PostgreSQL backup from the local Compose service:

```bash
docker compose exec -T postgres pg_dump -U application_tracker -d application_tracker -Fc > application-tracker.backup
```

Restore it into a fresh/empty local database:

```bash
docker compose exec -T postgres pg_restore -U application_tracker -d application_tracker --clean --if-exists < application-tracker.backup
```

`--clean` replaces database objects in the target database. Keep backup files somewhere outside the repository.

To inspect the local development database with pgAdmin, see
[Viewing the local database with pgAdmin](docs/pgadmin.md).

## Environment variables

The examples in `server/.env.example` and `client/.env.example` document all required values. The API runs on port 3001, the React Router client on 5173, PostgreSQL is available on host port 5433, and Ollama uses its standard `http://localhost:11434` URL.

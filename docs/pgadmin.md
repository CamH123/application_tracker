# Viewing the local database with pgAdmin

This guide connects pgAdmin to the PostgreSQL database used by the local Job
Tracker application. It is for the development database only; do not use the
test database unless you specifically need to inspect an integration test.

## 1. Start PostgreSQL and apply migrations

From the repository root, start the local development environment:

```bash
npm run local:start
```

This starts PostgreSQL, applies the database migrations, and starts the API and
client. Leave that command running while you use the app. PostgreSQL continues
to run in Docker after you stop the command with `Ctrl-C`; stop it explicitly
with `npm run local:stop` when you are done.

If you only need the database and it has already been migrated, start it with:

```bash
docker compose up -d --wait postgres
```

To check that the container is running:

```bash
docker compose ps
```

The `postgres` service should show as running (and healthy).

## 2. Register the server in pgAdmin

1. Open pgAdmin and enter your pgAdmin master password if prompted.
2. In the left sidebar, right-click **Servers**, then select **Register** >
   **Server…**.
3. On the **General** tab, enter a descriptive name, such as `Job Tracker
   Local`.
4. Open the **Connection** tab and enter these values:

   | Field | Value |
   | --- | --- |
   | Host name/address | `localhost` |
   | Port | `5433` |
   | Maintenance database | `application_tracker` |
   | Username | `application_tracker` |
   | Password | `application_tracker` |

5. Optionally check **Save password** so pgAdmin does not prompt each time.
6. Select **Save**.

These are the development-only credentials defined in
[`docker-compose.yml`](../docker-compose.yml). They also match the default
`DATABASE_URL` in `server/.env.example`.

## 3. Browse tables and data

In the object browser, expand:

```text
Servers
  └── Job Tracker Local
      └── Databases
          └── application_tracker
              └── Schemas
                  └── public
                      └── Tables
```

Right-click a table and choose **View/Edit Data** > **All Rows** to inspect its
records. Application data is primarily in `applications`, with related data in
`companies`, `recruiting_cycles`, and `application_events`.

To run a query, right-click `application_tracker`, choose **Query Tool**, then
run, for example:

```sql
SELECT id, role_title, submission_date
FROM applications
ORDER BY submission_date DESC;
```

Use the Execute button (or F5) to run the query. The result grid appears below
the editor.

## Troubleshooting

**pgAdmin cannot connect.** Confirm the container is running with `docker
compose ps`. Use `localhost`, not `postgres`: `postgres` is the Docker service
name and only resolves from other containers. The development container is
available on host port `5433`, which avoids a conflict with a native PostgreSQL
server using port `5432` on Windows.

**The database or tables are missing.** Run `npm run db:migrate` from the
repository root. If pgAdmin still shows old objects, right-click the database
or Tables node and select **Refresh**.

**You see test data instead.** The disposable integration-test database uses
port `55432` and database name `application_tracker_test` from
`docker-compose.test.yml`. It is separate from the development database and is
normally removed after the test command finishes.

**You want to change data.** pgAdmin can edit rows, but manual changes bypass
the application’s validation and can leave related data inconsistent. Prefer
using the app for ordinary changes; take a backup before manual updates.

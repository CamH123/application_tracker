import "dotenv/config";

import { createPool } from "./database/client.js";
import { createHttpApp } from "./http/app.js";

const port = Number(process.env.PORT ?? 3001);
const pool = createPool();
const app = createHttpApp(pool);

const server = app.listen(port, () => {
  console.log(`Job Tracker API listening on http://localhost:${port}`);
});

const shutdown = () => {
  server.close(() => void pool.end());
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

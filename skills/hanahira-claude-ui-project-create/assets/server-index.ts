import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import mysql from "mysql2/promise";

const PORT = Number(process.env.PORT ?? <port>);

// Pool, not a single connection: a dropped connection would otherwise
// take the whole app down until restart.
const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

const app = new Hono();
// Log every request except the healthcheck, which would add a line every 30 s.
const log = logger();
app.use("*", (c, next) => (c.req.path === "/health" ? next() : log(c, next)));
// Security headers from day one, before any route. HSTS starts short and
// without includeSubDomains: raise it only once every subdomain serves HTTPS.
app.use(
  "*",
  secureHeaders({
    strictTransportSecurity: "max-age=300",
    referrerPolicy: "strict-origin-when-cross-origin",
  }),
);

app.get("/health", async (c) => {
  try {
    await db.query("SELECT 1");
    return c.json({ status: "ok", db: "up" });
  } catch (err) {
    // Log the reason: it is what tells wrong credentials from MySQL down.
    console.error("health: db check failed:", (err as Error).message);
    // 503, not 500: the app is alive, the dependency is not.
    return c.json({ status: "degraded", db: "down" }, 503);
  }
});

app.get("/api/hello", (c) => c.json({ message: "<name> is running" }));

// Unknown API routes get a JSON 404 instead of falling through to the SPA's
// index.html with a 200, which would hide client-side typos in fetch URLs.
app.all("/api/*", (c) => c.json({ error: "not found" }, 404));

// Vite build output. Registered after the API routes so /api/* wins.
app.use("/*", serveStatic({ root: "./dist/client" }));
// A missing hashed asset (old chunk after a redeploy) must 404, not get
// index.html with a 200, which the browser would try to run as JS.
app.get("/assets/*", (c) => c.notFound());
app.get("*", serveStatic({ path: "./dist/client/index.html" }));

export default {
  port: PORT,
  // Host networking: the default 127.0.0.1 is loopback-only (front it with a
  // reverse proxy on the same host). HOST=0.0.0.0 in .env binds every host
  // interface (reachable from the network, subject to ufw).
  hostname: process.env.HOST || "127.0.0.1",
  fetch: app.fetch,
};

export { db };

import "dotenv/config";
import { createServer } from "http";
import net from "net";
import { createApp } from "./app";
import { writeOperationalEvent } from "../observability";
import { ENV } from "./env";
import { parseConfiguredPort } from "./port";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const { app, server } = await createApp();
  const preferredPort = parseConfiguredPort(process.env.PORT);

  // Managed production platforms route traffic to the exact PORT they provide.
  // Port fallback is only useful during local development.
  const port = ENV.isProduction ? preferredPort : await findAvailablePort(preferredPort);

  if (!ENV.isProduction && port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.on("error", error => {
    writeOperationalEvent("error", "server_listen_failed", {
      port,
      code: "code" in error && typeof error.code === "string" ? error.code : "UNKNOWN",
    });
    process.exitCode = 1;
  });

  server.listen(port, () => {
    writeOperationalEvent("info", "server_started", { port, production: ENV.isProduction });
  });
}

startServer().catch(error => {
  console.error("NSOS startup failed", error);
  process.exitCode = 1;
});

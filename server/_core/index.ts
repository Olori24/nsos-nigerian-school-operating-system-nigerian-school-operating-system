import "dotenv/config";
import { createApp } from "./app";
import { writeOperationalEvent } from "../observability";
import { ENV } from "./env";
import { parseConfiguredPort } from "./port";

async function startServer() {
  const { app, server } = await createApp();
  const preferredPort = parseConfiguredPort(process.env.PORT);

  // Managed production platforms route traffic to the exact PORT they provide.
  // Silently choosing another port makes the process appear healthy while the
  // platform health check and incoming traffic continue targeting the old port.
  // Port fallback is only useful during local development.
  const port = ENV.isProduction ? preferredPort : preferredPort;

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

import express, { type Express } from "express";
import fs from "node:fs";
import path from "node:path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");
  if (!fs.existsSync(distPath)) {
    console.error(`NSOS static build directory is missing: ${distPath}`);
  }

  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (path.basename(filePath) === "sw.js") {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      }
    },
  }));

  app.use("*", (_req, res, next) => {
    res.sendFile(path.resolve(distPath, "index.html"), error => {
      if (error) next(error);
    });
  });
}

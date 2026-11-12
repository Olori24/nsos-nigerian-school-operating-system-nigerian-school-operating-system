import express from "express";
import app from "./server/_core/index";

// Export a root Express handler so Vercel can discover the application entrypoint.
const handler = express();
handler.use(app);

export default handler;

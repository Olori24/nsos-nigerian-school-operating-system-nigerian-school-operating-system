import express from "express";
import app from "./server/_core/index";

// Export a root Express handler so Vercel's Express runtime can discover the application.
const handler = express();
handler.use(app);

export default handler;

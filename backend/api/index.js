import "dotenv/config";
import { createApp } from "../src/app.js";

// Vercel serverless entrypoint. Express apps are callable as (req, res),
// which is exactly the handler shape Vercel's Node runtime expects — no
// app.listen() here, Vercel invokes this per-request instead of running a
// long-lived server.
export default createApp();

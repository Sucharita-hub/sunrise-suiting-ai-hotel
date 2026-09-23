import "dotenv/config";
import { createApp } from "./app.js";

const PORT = Number(process.env.PORT || 5000);
const app = createApp();

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Sunrise Suites backend running on http://localhost:${PORT}`);
  });
}

export default app;

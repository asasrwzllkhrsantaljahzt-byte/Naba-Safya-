import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import path from "path";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
      res(res) { return { statusCode: res.statusCode }; },
    },
  }),
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// توجيه نقي ومباشر إلى الـ API الحقيقي وقاعدة البيانات
app.use("/api", router);

// ===== FRONTEND STATIC =====
const frontendPath = path.join(process.cwd(), "../water-factory/dist/public");
app.use(express.static(frontendPath));

app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

export default app;
import express from "express";
import path from "path";
import appConfig from "./config";
import proxyRoutes from "./routes/proxyRoutes";
import adsRoutes from "./routes/adsRoutes";
import ipRoutes from "./routes/ipRoutes";
import cors from "cors";

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.json());

// 挂载路由
app.use("/api", proxyRoutes);
app.use("/api", adsRoutes);
app.use("/api", ipRoutes);

app.listen(PORT, () => {
  console.log(`✅服务已启动 http://127.0.0.1:${PORT}`);
  if (!appConfig.adsPowerApiKey) {
    console.warn("⚠️ config.json 中 adsPowerApiKey 未配置，AdsPower功能不可用");
  }
});

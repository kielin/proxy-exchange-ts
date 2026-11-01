import fs from "fs";
import path from "path";

const configPath = path.join(__dirname, "../config.json");

export interface AppConfig {
  adsPowerApiKey: string;
  adsPowerBaseUrl: string;
}

let appConfig: AppConfig;

try {
  const raw = fs.readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(raw);
  appConfig = {
    adsPowerApiKey: parsed.adsPowerApiKey || "",
    adsPowerBaseUrl: "http://127.0.0.1:50325",
  };
} catch (e) {
  console.warn("⚠️ config.json 读取失败，AdsPower功能将不可用");
  appConfig = { adsPowerApiKey: "", adsPowerBaseUrl: "http://127.0.0.1:50325" };
}

export default appConfig;

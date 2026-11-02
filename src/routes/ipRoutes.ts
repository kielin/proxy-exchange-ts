import { Router, Request, Response } from "express";
import maxmind, { CityResponse } from "maxmind";
import { IpLookupResult } from "../types";
import path from "path";

const ipRoutes = Router();
let cityLookup: Awaited<ReturnType<typeof maxmind.open<CityResponse>>> | null = null;

// 初始化加载mmdb库
(async function initDb() {
  try {
    const dbPath = path.join(__dirname, "../../data/GeoLite2-City.mmdb");
    cityLookup = await maxmind.open<CityResponse>(dbPath);
    console.log("✅ 离线IP库加载成功");
  } catch (e) {
    console.error("❌ 离线IP库加载失败，请检查mmdb文件路径");
  }
})();

ipRoutes.get("/ip-lookup", async (req: Request, res: Response) => {
  try {
    const { ip } = req.query;
    if (!ip || typeof ip !== "string") {
      return res.json({ success: false, msg: "请传入ip参数" } as IpLookupResult);
    }
    if (!cityLookup) {
      return res.json({ success: false, msg: "IP数据库未加载" } as IpLookupResult);
    }

    const result = cityLookup.get(ip);
    if (!result) {
      return res.json({
        ip,
        country: "",
        region: "",
        city: "",
        isp: "",
        success: false,
        msg: "无该IP地理位置记录"
      });
    }

    const out: IpLookupResult = {
      ip,
      country: result.country?.names?.["zh-CN"] ?? result.country?.names?.en ?? "",
      region: result.subdivisions?.[0]?.names?.["zh-CN"] ?? result.subdivisions?.[0]?.names?.en ?? "",
      city: result.city?.names?.["zh-CN"] ?? result.city?.names?.en ?? "",
      isp: "",
      success: true
    };
    return res.json(out);
    

  } catch (err: any) {
    console.error("[ip-lookup]", err.message);
    return res.json({
      ip: req.query.ip as string,
      country: "",
      region: "",
      city: "",
      isp: "",
      success: false,
      msg: "解析异常"
    });
  }
});

export default ipRoutes;

// ===== NEW: 增加内部模块复用导出 (START) =====
/**
 * 供后端其它 Service/Controller 内部直接调用的高复用解析函数
 * 逻辑与路由完全复用，避免内部发起 HTTP 网络请求开销
 */
export async function resolveIpInternal(ip: string): Promise<IpLookupResult> {
  const defaultResult: IpLookupResult = { ip, country: "", region: "", city: "", isp: "", success: false };
  
  if (!ip || ip === "-" || ip.includes("127.0.0.1")) {
    return { ...defaultResult, msg: "无效的 IP 地址" };
  }

  try {
    // 💡 如果初始化有延迟，此处做一次兜底安全校验
    if (!cityLookup) {
      const dbPath = path.join(__dirname, "../../data/GeoLite2-City.mmdb");
      cityLookup = await maxmind.open<CityResponse>(dbPath);
    }

    if (cityLookup) {
      const result = cityLookup.get(ip);
      if (!result) {
        return { ...defaultResult, msg: "无该 IP 地理位置记录" };
      }

      // 完全复用你定义的映射逻辑
      return {
        ip,
        country: result.country?.names?.["zh-CN"] ?? result.country?.names?.en ?? "",
        region: result.subdivisions?.[0]?.names?.["zh-CN"] ?? result.subdivisions?.[0]?.names?.en ?? "",
        city: result.city?.names?.["zh-CN"] ?? result.city?.names?.en ?? "",
        isp: "",
        success: true
      };
    }
  } catch (err: any) {
    console.error("[resolveIpInternal] 内部解析异常:", err.message);
  }
  return { ...defaultResult, msg: "解析异常" };
}
// ===== NEW: 增加内部模块复用导出 (END) =====


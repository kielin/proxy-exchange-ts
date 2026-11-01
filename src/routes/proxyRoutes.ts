import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import dayjs from "dayjs";
import { fetchOrders, fetchProxyDetails, exchangeProxies } from "../services/diquipApi";
import { ProxyItem, ExchangeItem, CompareRow, ExchangeBody, GetListBody } from "../types";
import { writeHistoryLog } from "../utils/log";

const router = Router();

/** GET /api/get_orders */
router.post("/get_orders", async (req: Request, res: Response) => {
  try {
    const { cookie } = req.body;
    if (!cookie) return res.status(400).json({ code: -1, msg: "cookie不能为空" });
    const respData = await fetchOrders(cookie);
    if (respData.code !== 0) {
      return res.json({ code: -2, msg: "获取订单列表失败", data: respData });
    }
    return res.json({ code: 0, data: respData.list || [] });
  } catch (err: any) {
    console.error("[get_orders]", err.message);
    return res.json({ code: -99, msg: "请求异常/网络超时：" + err.message });
  }
});

/** GET /api/get_list */
router.post("/get_list", async (req: Request, res: Response) => {
  try {
    const { cookie, iid, filterKeywords } = req.body as GetListBody;
    if (!cookie || !iid) return res.status(400).json({ code: -1, msg: "参数不全" });

    const detailResp = await fetchProxyDetails(cookie, iid);
    if (detailResp.code !== 0) {
      return res.json({ code: -2, msg: "获取代理列表失败", data: detailResp });
    }

    const list: ProxyItem[] = detailResp.list || [];
    let keywords = filterKeywords || [];
    if (keywords.length === 0) keywords = ["ej", "交易"];

    const filtered = list.filter((item) => {
      const note = (item.note || "").toLowerCase();
      return !keywords.some((kw) => note.includes(kw.toLowerCase()));
    });

    return res.json({ code: 0, data: filtered });
  } catch (err: any) {
    console.error("[get_list]", err.message);
    return res.json({ code: -99, msg: "请求异常/网络超时：" + err.message });
  }
});

/** POST /api/exchange_ip */
router.post("/exchange_ip", async (req: Request, res: Response) => {
  try {
    const { cookie, iid, ids, isrand = 3 } = req.body as ExchangeBody;
    if (!cookie || !iid || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ code: -1, msg: "参数不全" });
    }

    // 1. 拿旧数据
    const detailResp = await fetchProxyDetails(cookie, iid);
    if (detailResp.code !== 0) {
      return res.json({ code: -2, msg: "获取代理详情失败", data: detailResp });
    }
    const oldList: ProxyItem[] = detailResp.list || [];
    const oldMap = new Map<number, ProxyItem>();
    oldList.forEach((o) => oldMap.set(o.id, o));

    // 2. 执行调换
    const exchangeResp = await exchangeProxies(cookie, ids, isrand);
    if (exchangeResp.code !== 0) {
      return res.json({ code: -3, msg: "调换接口返回错误", data: exchangeResp });
    }
    const newList: ExchangeItem[] = exchangeResp.list || [];

    // 3. 组装对照表
    const table: CompareRow[] = [];
    for (const n of newList) {
      const old = oldMap.get(n.id);
      if (!old) continue;
      const projectName = old.project?.title ?? "未知项目";
      const beforeSocks = `socks5://${old.p_user}:${old.p_pass}@${old.ip}:${old.port}`;
      const afterSocks = `socks5://${n.p_user}:${n.p_pass}@${n.ip}:${n.port}`;
      table.push({
        proxyId: n.id,
        project: projectName,
        beforeCity: old.cityname ?? "-",
        beforeSocks,
        afterCity: n.cityname ?? "-",
        afterSocks,
      });
    }

    writeHistoryLog(table);
    return res.json({ code: 0, msg: "success", table });
  } catch (err: any) {
    console.error("[exchange_ip]", err.message);
    return res.json({ code: -99, msg: "请求异常/网络超时：" + err.message });
  }
});

export default router;

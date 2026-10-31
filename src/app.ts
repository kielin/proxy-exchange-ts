import express, { Request, Response } from "express";
import axios from "axios";
import fs from "fs";
import path from "path";
import dayjs from "dayjs";
import {
  ExchangeBody,
  CompareRow,
  ProxyItem,
  ExchangeItem,
  OrderItem,
  GetListBody,
} from "./types";

const app = express();
const PORT = 8000;
const BASE_URL = "http://diquip.wangluoip.com";

app.use(express.static(path.join(__dirname, "../public")));
app.use(express.json());

const HTTP_HEADERS = {
  Accept: "application/json, text/javascript, */*; q=0.01",
  "Accept-Language": "zh-CN,zh;q=0.9,en-CN;q=0.8,en;q=0.7",
  Origin: BASE_URL,
  Referer: `${BASE_URL}/user/`,
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36",
  "X-Requested-With": "XMLHttpRequest",
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
};

// axios请求配置：自动读HTTP_PROXY环境变量，带超时
function getAxiosOpts() {
  const opts: any = { timeout: 12000 };
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  if (httpProxy) {
    const url = new URL(httpProxy);
    opts.proxy = {
      host: url.hostname,
      port: Number(url.port),
    };
  }
  return opts;
}

/** 获取订单列表 index接口 */
async function getOrderIndex(cookie: string) {
  console.log("[getOrderIndex] 开始请求订单列表");
  const params = new URLSearchParams();
  params.append("state", "1");
  params.append("startTime", "");
  params.append("endTime", "");
  params.append("pid", "0");
  params.append("orderno", "");
  params.append("page", "1");
  params.append("limit", "999");

  const reqHeaders = {
    ...HTTP_HEADERS,
    Cookie: cookie,
  };
  const resp = await axios.post(`${BASE_URL}/user/myproxy/index`, params, {
    headers: reqHeaders,
    ...getAxiosOpts(),
  });
  console.log("[getOrderIndex] 请求完成 code=", resp.data.code);
  return resp.data;
}

/** 获取代理详情 */
async function getProxyDetail(cookie: string, iid: string) {
  console.log("[getProxyDetail] 请求iid=", iid);
  const params = new URLSearchParams();
  params.append("iid", iid);
  params.append("page", "1");
  params.append("limit", "999");

  const reqHeaders = {
    ...HTTP_HEADERS,
    Cookie: cookie,
  };

  const resp = await axios.post(`${BASE_URL}/user/myproxy/details`, params, {
    headers: reqHeaders,
    ...getAxiosOpts(),
  });
  return resp.data;
}

/** 执行调换 */
async function runExchange(cookie: string, ids: string[], isrand: number) {
  const ts = Date.now();
  const params = new URLSearchParams();
  params.append("isrand", String(isrand));
  params.append("user", "");
  params.append("pass", "");
  params.append("type", "0");
  ids.forEach((sid) => params.append("ids[]", sid));

  const url = `${BASE_URL}/user/gbuy/IdenticalAndRandomExchange?${ts}`;
  const reqHeaders = {
    ...HTTP_HEADERS,
    Cookie: cookie,
  };

  const resp = await axios.post(url, params, {
    headers: reqHeaders,
    ...getAxiosOpts(),
  });
  return resp.data;
}

/** 写入日志 history-日期.txt */
function writeHistoryLog(rows: CompareRow[]) {
  const dateStr = dayjs().format("YYYY-MM-DD");
  const logFileName = `history-${dateStr}.txt`;
  const logPath = path.join(__dirname, "../", logFileName);
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");

  let logLines: string[] = [];
  for (const r of rows) {
    logLines.push(`${now}：  旧： ${r.project}|${r.beforeCity} ${r.proxyId}`);
    logLines.push(`${r.beforeSocks}  --> ${r.project}|${r.afterCity} ${r.proxyId}`);
    logLines.push(`${r.afterSocks}`);
    logLines.push("");
  }
  fs.appendFileSync(logPath, logLines.join("\n"), "utf-8");
}

// 获取订单列表接口
app.post("/api/get_orders", async (req: Request, res: Response) => {
  try {
    const { cookie } = req.body;
    if (!cookie) return res.status(400).json({ code: -1, msg: "cookie不能为空" });
    const respData = await getOrderIndex(cookie);
    if (respData.code !== 0) return res.json({ code: -2, msg: "获取订单列表失败", data: respData });
    const list: OrderItem[] = respData.list || [];
    return res.json({ code: 0, data: list });
  } catch (err: any) {
    console.error("[api/get_orders 异常]", err.message);
    return res.json({ code: -99, msg: "请求异常/网络超时：" + err.message });
  }
});

// 获取代理列表，支持自定义过滤关键词
app.post("/api/get_list", async (req: Request, res: Response) => {
  try {
    const body = req.body as GetListBody;
    const { cookie, iid, filterKeywords } = body;
    if (!cookie || !iid) return res.status(400).json({ code: -1, msg: "参数不全" });
    const detailResp = await getProxyDetail(cookie, iid);
    if (detailResp.code !== 0) return res.json({ code: -2, msg: "获取代理列表失败", data: detailResp });
    const list: ProxyItem[] = detailResp.list || [];

    let keywords: string[] = filterKeywords || [];
    if (keywords.length === 0) {
      keywords = ["ej", "交易"];
    }
    const filtered = list.filter((item) => {
      const note = (item.note || "").toLowerCase();
      for (const kw of keywords) {
        if (note.includes(kw.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
    return res.json({ code: 0, data: filtered });
  } catch (err: any) {
    console.error("[api/get_list 异常]", err.message);
    return res.json({ code: -99, msg: "请求异常/网络超时：" + err.message });
  }
});

// 完整调换接口
app.post("/api/exchange_ip", async (req: Request, res: Response) => {
  try {
    const body = req.body as ExchangeBody;
    const { cookie, iid, ids, isrand = 3 } = body;
    if (!cookie || !iid || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ code: -1, msg: "参数不全" });
    }

    const detailResp = await getProxyDetail(cookie, iid);
    if (detailResp.code !== 0) {
      return res.json({ code: -2, msg: "获取代理详情失败", data: detailResp });
    }
    const oldList: ProxyItem[] = detailResp.list || [];
    const oldMap = new Map<number, ProxyItem>();
    oldList.forEach((o) => oldMap.set(o.id, o));

    const exchangeResp = await runExchange(cookie, ids, isrand);
    if (exchangeResp.code !== 0) {
      return res.json({ code: -3, msg: "调换接口返回错误", data: exchangeResp });
    }
    const newList: ExchangeItem[] = exchangeResp.list || [];

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
    return res.json({
      code: 0,
      msg: "success",
      table,
    });
  } catch (err: any) {
    console.error("[api/exchange_ip 异常]", err.message);
    return res.json({ code: -99, msg: "请求异常/网络超时：" + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅服务已启动 http://127.0.0.1:${PORT}`);
  console.log("ℹ️ 自动读取环境变量 HTTP_PROXY");
});

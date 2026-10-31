import axios from "axios";

const BASE_URL = "http://diquip.wangluoip.com";

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

// 公共axios配置：超时 + 代理
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

function buildHeaders(cookie: string) {
  return { ...HTTP_HEADERS, Cookie: cookie };
}

/** 1. 获取订单列表（index接口） */
export async function fetchOrders(cookie: string) {
  console.log("[diquip] 获取订单列表...");
  const params = new URLSearchParams();
  params.append("state", "1");
  params.append("startTime", "");
  params.append("endTime", "");
  params.append("pid", "0");
  params.append("orderno", "");
  params.append("page", "1");
  params.append("limit", "999");

  const resp = await axios.post(`${BASE_URL}/user/myproxy/index`, params, {
    headers: buildHeaders(cookie),
    ...getAxiosOpts(),
  });
  return resp.data;
}

/** 2. 获取代理详情（details接口） */
export async function fetchProxyDetails(cookie: string, iid: string) {
  console.log("[diquip] 获取代理详情 iid=", iid);
  const params = new URLSearchParams();
  params.append("iid", iid);
  params.append("page", "1");
  params.append("limit", "999");

  const resp = await axios.post(`${BASE_URL}/user/myproxy/details`, params, {
    headers: buildHeaders(cookie),
    ...getAxiosOpts(),
  });
  return resp.data;
}

/** 3. 执行调换 */
export async function exchangeProxies(cookie: string, ids: string[], isrand: number) {
  console.log("[diquip] 执行调换 ids=", ids);
  const ts = Date.now();
  const params = new URLSearchParams();
  params.append("isrand", String(isrand));
  params.append("user", "");
  params.append("pass", "");
  params.append("type", "0");
  ids.forEach((sid) => params.append("ids[]", sid));

  const url = `${BASE_URL}/user/gbuy/IdenticalAndRandomExchange?${ts}`;
  const resp = await axios.post(url, params, {
    headers: buildHeaders(cookie),
    ...getAxiosOpts(),
  });
  return resp.data;
}

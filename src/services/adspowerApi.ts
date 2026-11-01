import axios from "axios";
import appConfig from "../config";
import { AdsPowerResultItem } from "../types";

/** 解析 socks5://user:pass@ip:port */
export function parseSocksUrl(url: string) {
  const u = new URL(url);
  return {
    type: "socks5",
    host: u.hostname,
    port: u.port,
    user: u.username,
    password: u.password,
  };
}

/** 测试socks代理连通性 */
export async function testSocksProxy(
  item: { host: string; port: string; user: string; password: string },
  timeout = 8000
): Promise<boolean> {
  try {
    const { SocksProxyAgent } = require("socks-proxy-agent");
    const agent = new SocksProxyAgent({
      hostname: item.host,
      port: item.port,
      username: item.user,
      password: item.password,
    });
    await axios.get("http://httpbin.org/ip", {
      httpAgent: agent,
      timeout,
    });
    return true;
  } catch {
    return false;
  }
}

/** 批量添加代理到AdsPower，接口要求body是数组 */
export async function addProxiesToAdsPower(socksList: string[]): Promise<{ results: AdsPowerResultItem[]; proxyIds: string[] }> {
  const results: AdsPowerResultItem[] = [];
  const proxyIds: string[] = [];
  const apiKey = appConfig.adsPowerApiKey?.trim();

  if (!apiKey) {
    return {
        results: socksList.map((s) => ({
            socks: s,
            addOk: false,
            testOk: false,
            msg: "config.json 中 adsPowerApiKey 未配置",
        })),
        proxyIds,
    };
}

  // 1. 解析所有socks，组装成接口要求的数组
  const proxyBatchPayload = socksList.map(s => {
    const p = parseSocksUrl(s);
    return {
      type: p.type,
      host: p.host,
      port: String(p.port), // 重点：port转为字符串！
      user: p.user,
      password: p.password,
      ipchecker: "ip2location",
      remark: "EJ注册",
    };
  });

  try {
    const addResp = await axios.post(
      `${appConfig.adsPowerBaseUrl}/api/v2/proxy-list/create`,
      proxyBatchPayload, // ✅ 直接传数组，匹配接口要求
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    if (addResp.data.code === 0) {
      // Successfully added proxies, extract proxy IDs
      proxyIds.push(...(addResp.data.data.proxy_id || []));
      console.log(`proxyIds are: ${proxyIds}`)
      // 添加成功，逐个连通测试
      for (let i = 0; i < socksList.length; i++) {
        const p = proxyBatchPayload[i];
        const testOk = false;//await testSocksProxy(p);
        results.push({
          socks: socksList[i],
          addOk: true,
          testOk,
          msg: testOk ? "✅添加成功｜连通正常" : "✅添加成功｜连通测试失败",
        });
      }
    } else {
      // 接口返回业务错误
      for (const s of socksList) {
        results.push({
          socks: s,
          addOk: false,
          testOk: false,
          msg: `❌添加失败: ${addResp.data.msg}`,
        });
      }
    }
  } catch (e: any) {
    for (const s of socksList) {
      results.push({
        socks: s,
        addOk: false,
        testOk: false,
        msg: `❌异常: ${e.message}`,
      });
    }
  }
  return { results, proxyIds };;
}

/**
 * Batch add proxies to AdsPower. The API requires the body to be an array.
 */
// export async function addProxiesToAdsPower(socksList: string[]): Promise<{ results: AdsPowerResultItem[]; proxyIds: string[] }> {
  // const results: AdsPowerResultItem[] = [];
  // const proxyIds: string[] = [];
  // const apiKey = appConfig.adsPowerApiKey?.trim();

  // if (!apiKey) {
  //     return {
  //         results: socksList.map((s) => ({
  //             socks: s,
  //             addOk: false,
  //             testOk: false,
  //             msg: "config.json 中 adsPowerApiKey 未配置",
  //         })),
  //         proxyIds,
  //     };
  // }

//   // 1. Parse all socks and assemble them into the format required by the API
//   const proxyBatchPayload = socksList.map((s) => {
//       const p = parseSocksUrl(s);
//       return {
//           type: p.type,
//           host: p.host,
//           port: String(p.port), // Convert port to string
//           user: p.user,
//           password: p.password,
//           ipchecker: "ip2location",
//           remark: "EJ注册",
//       };
//   });

//   try {
//       const addResp = await axios.post(
//           `${appConfig.adsPowerBaseUrl}/api/v2/proxy-list/create`,
//           proxyBatchPayload, // Directly pass the array to match the API requirements
//           {
//               headers: {
//                   Authorization: `Bearer ${apiKey}`,
//                   "Content-Type": "application/json",
//               },
//               timeout: 15000,
//           }
//       );

//       if (addResp.data.code === 0) {
//           // Successfully added proxies, extract proxy IDs
//           proxyIds.push(...(addResp.data.data.proxy_id || []));

//           // Test connectivity for each proxy
//           for (let i = 0; i < socksList.length; i++) {
//               const p = proxyBatchPayload[i];
//               const testOk = await testSocksProxy(p);
//               results.push({
//                   socks: socksList[i],
//                   addOk: true,
//                   testOk,
//                   msg: testOk ? "✅添加成功｜连通正常" : "✅添加成功｜连通测试失败",
//               });
//           }
//       } else {
//           // API returned a business error
//           for (const s of socksList) {
//               results.push({
//                   socks: s,
//                   addOk: false,
//                   testOk: false,
//                   msg: `❌添加失败: ${addResp.data.msg}`,
//               });
//           }
//       }
//   } catch (e: any) {
//       // Handle exceptions
//       for (const s of socksList) {
//           results.push({
//               socks: s,
//               addOk: false,
//               testOk: false,
//               msg: `❌异常: ${e.message}`,
//           });
//       }
//   }

//   return { results, proxyIds };
// }

import axios from "axios";
import config from "../config";
import { ProfileCreateItem } from "../types";
import { withTimeout } from "../utils/timeoutWrapper";


function getHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.adsPowerApiKey}`,
    };
}

/**
 * Create a single environment.
 */
async function createSingleProfile(proxyId: string, tagId: string): Promise<ProfileCreateItem> {
  const headers = getHeaders();
  const url = `${config.adsPowerBaseUrl}/api/v2/browser-profile/create`;
  const requestBody = {
      group_id: "0", // Default group
      proxyid: proxyId,
      profile_tag_ids: [tagId],
      remark: "EJ注册",
      platform:`${config.envBrowserTab}`,
      tabs:[`${config.envBrowserTab}`],
      fingerprint_config: {
          gpu: "2", // Disable hardware acceleration
          browser_kernel_config: {
              type: "chrome",
              version: "ua_auto",
          },
          random_ua: {
              ua_system_version: ["Windows", "Mac OS X", "Android", "iOS"], // Exclude Linux
          },
      },
  };

  console.log("[createSingleProfile] Request Headers:", headers);
  console.log("[createSingleProfile] Request Body:", requestBody);

  const ret: ProfileCreateItem = {
      proxy_id: proxyId,
      profile_id: "",
      profile_no: "",
      addOk: false,
      msg: "",
      debug: {
          method: "POST",
          url,
          headers: { ...headers, Authorization: "Bearer ***" },
          requestBody,
          responseBody: null,
      },
  };

  try {
      const resp = await withTimeout(
          axios.post(url, requestBody, { headers, timeout: 15000 }),
          15000,
          "创建环境超时"
      );

      console.log("[createSingleProfile] Response Body:", resp.data);

      ret.debug.responseBody = resp.data;
      if (resp.data.code === 0) {
          const data = resp.data.data || {};
          ret.profile_id = data.profile_id || "";
          ret.profile_no = String(data.profile_no || "");
          ret.addOk = true;
          ret.msg = "✅环境创建成功";
      } else {
          ret.msg = `❌环境创建失败: ${resp.data.msg}`;
      }
  } catch (e: any) {
      console.error("[createSingleProfile] Error:", e.message);
      ret.debug.responseBody = { error: e.message };
      ret.msg = `❌异常: ${e.message}`;
  }
  return ret;
}

/**
 * Batch create environments (up to 2 at a time).
 */
export async function batchCreateProfile(proxyIds: string[]): Promise<ProfileCreateItem[]> {
  let tagId: string;
  try {
      tagId = "1583792";//await getEjTagId(); // Fetch the "EJ 注册" tag ID
      console.log("[batchCreateProfile] Retrieved Tag ID:", tagId);
    } catch (e: any) {
      console.error("[batchCreateProfile] Failed to retrieve Tag ID:", e.message);
      return proxyIds.map(pid => ({
          proxy_id: pid,
          profile_id: "",
          profile_no: "",
          addOk: false,
          msg: `获取标签ID失败: ${e.message}`,
          debug: { method: "", url: "", headers: {}, requestBody: {}, responseBody: {} },
      }));
  }

  const safeList = proxyIds.slice(0, 2); // Limit to 2 profiles per batch
  const resList: ProfileCreateItem[] = [];
  for (const pid of safeList) {
      console.log("[batchCreateProfile] Creating Profile for Proxy ID:", pid);
      const r = await createSingleProfile(pid, tagId);
      console.log("[batchCreateProfile] Result for Proxy ID:", pid, r);
      resList.push(r);
      await new Promise(resolve => setTimeout(resolve, 600)); // Delay between requests
  }
  return resList;
}
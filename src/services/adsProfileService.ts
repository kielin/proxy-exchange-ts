import axios from "axios";
import config from "../config";
import { ProfileCreateItem } from "../types";
import { withTimeout } from "../utils/timeoutWrapper";
import { resolveIpInternal } from "../routes/ipRoutes";

function getHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.adsPowerApiKey}`,
    };
}

/**
 * Create a single environment and orchestrate browser automation.
 */
async function createSingleProfile(proxyId: string, tagId: string): Promise<ProfileCreateItem> {
    const headers = getHeaders();
    const url = `${config.adsPowerBaseUrl}/api/v2/browser-profile/create`;
    const requestBody = {
        group_id: "0", // Default group
        proxyid: proxyId,
        profile_tag_ids: [tagId],
        remark: "EJ注册",
        platform: `${config.envBrowserTab}`,
        tabs: [`${config.envBrowserTab}`],
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
            const profile_id = data.id || data.profile_id || "";
            const profile_no = String(data.serial_number || data.profile_no || "");
            
            ret.profile_id = profile_id;
            ret.profile_no = profile_no;
            ret.addOk = true;
            ret.msg = "✅环境创建成功";
  
            if (profile_id) {
                try {
                    // A. 启动浏览器
                    const startUrl = `${config.adsPowerBaseUrl}/api/v2/browser-profile/start`;
                    const startBody = {
                        profile_id,
                        launch_args: ["--window-position=400,0", "--blink-settings=imagesEnabled=false", "--disable-notifications"],
                        headless: "0", last_opened_tabs: "1", proxy_detection: "1", password_filling: "0", password_saving: "0", cdp_mask: "1", delete_cache: "0", device_scale: "1"
                    };
                    const startResp = await axios.post(startUrl, startBody, { headers, timeout: 10000 });
                    
                    // 💡 延长等待到 3 秒，确保代理连接和 IP 出口彻底就绪
                    await new Promise(resolve => setTimeout(resolve, 3000));
  
                    if (startResp.data && startResp.data.code === 0) {
                        // B. 验证状态
                        const activeUrl = `${config.adsPowerBaseUrl}/api/v2/browser-profile/active?profile_id=${profile_id}&profile_no=${profile_no}`;
                        const activeResp = await axios.get(activeUrl, { headers, timeout: 5000 });
                        
                        // C. 查询 UA (增加对象与数组的多重容错)
                        const uaUrl = `${config.adsPowerBaseUrl}/api/v2/browser-profile/ua`;
                        const uaResp = await axios.post(uaUrl, { profile_no: [profile_no] }, { headers, timeout: 5000 });
                        
                        let fetchedUa = "-";
                        const uaListData = uaResp.data?.data?.list;
                        if (Array.isArray(uaListData) && uaListData.length > 0) {
                            fetchedUa = uaListData[0]?.ua || "-";
                        } else if (uaListData && typeof uaListData === 'object') {
                            // 兼容 v2 对象键值对返回
                            const firstKey = Object.keys(uaListData)[0];
                            fetchedUa = uaListData[firstKey]?.ua || "-";
                        }
  
                        // D. 查询 IP 与归属地
                        const listUrl = `${config.adsPowerBaseUrl}/api/v2/browser-profile/list`;
                        const listResp = await axios.post(listUrl, { profile_id: [profile_id], limit: 10, page: 1 }, { headers, timeout: 5000 });
                        
                        // 💡 容错读取 v2 的 list 数组或对象节点
                        let fetchedIp = "-";
                        let fetchedCountry = "-";
                        const listData = listResp.data?.data?.list;

                        if (Array.isArray(listData) && listData.length > 0) {
                            fetchedIp = listData[0]?.ip || "-";
                            fetchedCountry = listData[0]?.ip_country || "-";
                        } else if (listData && typeof listData === 'object') {
                            const firstKey = Object.keys(listData)[0];
                            fetchedIp = listData[firstKey]?.ip || "-";
                            fetchedCountry = listData[firstKey]?.ip_country || "-";
                        }

                        // ===== 💎 松耦合高复用：动态调用刚才导出的 MaxMind 内部服务 =====
                        const detailedLoc = await resolveIpInternal(fetchedIp);

                        // 将多维度获取的数据挂载到对象中，向上传递给前端渲染
                        (ret as any).browser_status = activeResp.data?.data?.status || "Unknown";
                        (ret as any).browser_ua = fetchedUa;
                        (ret as any).browser_ip = fetchedIp;
                        
                        // 💡 核心对齐：将 country、region (省份)、city 优雅合并，去除空白，拼成 "中国 湖北省 武汉市" 格式
                        if (detailedLoc && detailedLoc.success) {
                            const parts = [detailedLoc.country, detailedLoc.region, detailedLoc.city].filter(Boolean);
                            (ret as any).browser_location = parts.join(" "); 
                        } else {
                            // 保底策略：如果 mmdb 没查到，降级使用 AdsPower 传回的默认国家码（如 CN）
                            (ret as any).browser_location = fetchedCountry.toUpperCase(); 
                        }
                        
                        ret.msg = `✅环境创建并自动启动成功 [${(ret as any).browser_location}]`;

                    } else {
                        ret.msg = `✅环境已建，但浏览器启动失败: ${startResp.data?.msg}`;
                    }
                } catch (err: any) {
                    console.error("[automation sub-flow error]", err.message);
                    ret.msg = `✅环境已建，自动联动流程异常: ${err.message}`;
                }
            }
  
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
        tagId = "1583792"; 
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
  
    const safeList = proxyIds.slice(0, 2); 
    const resList: ProfileCreateItem[] = [];
    for (const pid of safeList) {
        console.log("[batchCreateProfile] Creating Profile for Proxy ID:", pid);
        const r = await createSingleProfile(pid, tagId);
        console.log("[batchCreateProfile] Result for Proxy ID:", pid, r);
        resList.push(r);
        await new Promise(resolve => setTimeout(resolve, 1500)); 
    }
    return resList;
  }

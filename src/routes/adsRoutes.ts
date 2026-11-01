import { Router, Request, Response } from "express";
import { addProxiesToAdsPower } from "../services/adspowerApi";
import {  batchCreateProfile } from "../services/adsProfileService";
import { AddAdsPowerBody } from "../types";
const router = Router();

/** POST /api/add_to_adspower */
router.post("/add_to_adspower", async (req: Request, res: Response) => {
  try {
    const { socksList } = req.body as AddAdsPowerBody;
    if (!Array.isArray(socksList) || socksList.length === 0) {
      return res.json({ code: -1, msg: "没有socks链接" });
    }
    const {results, proxyIds} = await addProxiesToAdsPower(socksList);
    console.log(`In adsRoutes proxyIds are: ${proxyIds}`)
    return res.json({ code: 0, data: {results,proxyIds }});
  } catch (err: any) {
    console.error("[add_to_adspower]", err.message);
    return res.json({ code: -99, msg: err.message });
  }
});

/** POST /api/create_environment */
router.post("/create_environment", async (req: Request, res: Response) => {
  try {
      const { proxyIds } = req.body;

      if (!proxyIds || !Array.isArray(proxyIds)) {
          return res.json({ code: -1, msg: "proxyIds must be an array" });
      }

      console.log("[/create_environment] Incoming Request Body:", req.body);

      // Add proxies to AdsPower and get proxy IDs
      // const { results, proxyIds } = await addProxiesToAdsPower(socksList);

      console.log("[/create_environment] Proxy IDs:", proxyIds);

      if (!proxyIds.length) {
          return res.json({ code: -1, msg: "没有可用的代理 ID" });
      }

      // Create environments using the proxy IDs
      const createResults = await batchCreateProfile(proxyIds);

      console.log("[/create_environment] Batch Create Results:", createResults);

      return res.json({ code: 0, data: { createResults } });
  } catch (err: any) {
      console.error("[/create_environment] Error:", err.message);
      return res.json({ code: -99, msg: err.message });
  }
});

export default router;
import { Router, Request, Response } from "express";
import { addProxiesToAdsPower } from "../services/adspowerApi";
import { AddAdsPowerBody } from "../types";

const router = Router();

/** POST /api/add_to_adspower */
router.post("/add_to_adspower", async (req: Request, res: Response) => {
  try {
    const { socksList } = req.body as AddAdsPowerBody;
    if (!Array.isArray(socksList) || socksList.length === 0) {
      return res.json({ code: -1, msg: "没有socks链接" });
    }
    const results = await addProxiesToAdsPower(socksList);
    return res.json({ code: 0, data: results });
  } catch (err: any) {
    console.error("[add_to_adspower]", err.message);
    return res.json({ code: -99, msg: err.message });
  }
});

export default router;

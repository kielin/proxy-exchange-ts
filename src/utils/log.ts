import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import dayjs from "dayjs";
import { ProxyItem, ExchangeItem, CompareRow, ExchangeBody, GetListBody, EnvCreateRow } from "../types";

/** 
 * 写历史日志（通用公用方法）
 * 支持传入 CompareRow[] (IP调换) 或 EnvCreateRow[] (环境创建)
 */
export function writeHistoryLog(rows: (CompareRow | EnvCreateRow)[]) {
  if (!rows || rows.length === 0) return;

  const dateStr = dayjs().format("YYYY-MM-DD");
  const logFileName = `history-${dateStr}.txt`;
  const logPath = path.join(__dirname, "../../", logFileName);
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");

  const lines: string[] = [];

  // ===== NEW: START =====
  // 检查传入的数组类型：通过判断第一个元素是否包含 'profileId' 字段来区分
  const isEnvCreate = 'profileId' in rows[0];

  if (isEnvCreate) {
    // 处理环境创建日志
    const envRows = rows as EnvCreateRow[];
    for (const r of envRows) {
      lines.push(`${now}： [创建环境] 代理ID: ${r.proxyId} | 状态: ${r.status}| 环境ID: ${r.profileId} | 环境序号: ${r.profileNo}`);
    }
  } else {
    // ===== NEW: END =====
    
    // 原有的 IP 调换日志逻辑保持不变
    const compareRows = rows as CompareRow[];
    for (const r of compareRows) {
      lines.push(`${now}：  旧： ${r.project}|${r.beforeCity} ${r.proxyId}`);
      lines.push(`${r.beforeSocks}  --> ${r.project}|${r.afterCity} ${r.proxyId}`);
      lines.push(`${r.afterSocks}`);
      lines.push("");
    }
  }

  fs.appendFileSync(logPath, lines.join("\n"), "utf-8");
}

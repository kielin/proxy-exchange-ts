// index接口订单（iid来源）
export interface OrderItem {
  id: number;
  orderno: string;
  pid: number;
  proname: string;
  note?: string;
  num: number;
  areaname?: string;
}

// 代理详情单条
export interface ProxyItem {
  id: number;
  ip: string;
  port: number;
  p_user: string;
  p_pass: string;
  cityname?: string;
  project?: { title: string };
  note?: string;
}

// 调换返回单条
export interface ExchangeItem {
  id: number;
  ip: string;
  port: number;
  p_user: string;
  p_pass: string;
  cityname?: string;
  project?: { title: string };
  note?: string;
}

// 接口入参
export interface ExchangeBody {
  cookie: string;
  iid: string;
  ids: string[];
  isrand?: number;
}

export interface GetListBody {
  cookie: string;
  iid: string;
  filterKeywords: string[];
}

// 输出对比行
export interface CompareRow {
  proxyId: number;
  project: string;
  beforeCity: string;
  beforeSocks: string | null;
  afterCity: string;
  afterSocks: string;
}

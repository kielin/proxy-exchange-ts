// ========== diquip 相关类型 ==========
export interface OrderItem {
  id: number;
  orderno: string;
  pid: number;
  proname: string;
  note?: string;
  num: number;
  areaname?: string;
}

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

export interface CompareRow {
  proxyId: number;
  project: string;
  beforeCity: string;
  beforeSocks: string | null;
  afterCity: string;
  afterSocks: string;
}

// ========== 请求体类型 ==========
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

export interface AddAdsPowerBody {
  socksList: string[];
}

// ========== AdsPower 返回类型 ==========
export interface AdsPowerResultItem {
  socks: string;
  addOk: boolean;
  testOk: boolean;
  msg: string;
}

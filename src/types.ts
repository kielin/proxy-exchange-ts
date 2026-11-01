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

// 单条环境创建结果，附带完整调试报文
export interface ProfileCreateItem {
  proxy_id: string;
  profile_id: string;
  profile_no: string;
  addOk: boolean;
  msg: string;
  debug: {
    method: string;
    url: string;
    headers: Record<string, string>;
    requestBody: Record<string, any>;
    responseBody: any;
  };
}

// 统一接口返回
export interface ApiResp<T> {
  code: number;
  data?: T;
  msg: string;
}

// 主接口入参：socks数组
export interface BatchCreateInput {
  socksList: string[];
}

// 最终合并返回：代理列表 + 对应的环境列表
export interface BatchCreateResult {
  profileList: ProfileCreateItem[];
}

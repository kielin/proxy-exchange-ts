/**
 * 给promise加强制超时兜底，超时直接reject，防止底层socket hang无法被axios timeout捕获
 * @param p 原始Promise
 * @param ms 超时毫秒
 * @param errMsg 报错信息
 */
export function withTimeout<T>(p: Promise<T>, ms: number, errMsg = "操作超时"): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(errMsg)), ms);
    })
  ]);
}

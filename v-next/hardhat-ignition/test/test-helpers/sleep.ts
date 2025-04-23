export const sleep = (timeout: number): Promise<void> =>
  new Promise((res) => setTimeout(res, timeout));

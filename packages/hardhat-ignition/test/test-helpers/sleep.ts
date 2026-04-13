export const sleep = async (timeout: number): Promise<void> =>
  await new Promise((res) => setTimeout(res, timeout));

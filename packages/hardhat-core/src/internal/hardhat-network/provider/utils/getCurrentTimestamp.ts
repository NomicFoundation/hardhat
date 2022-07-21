export function getCurrentTimestamp(): bigint {
  return BigInt(Math.ceil(new Date().getTime() / 1000));
}

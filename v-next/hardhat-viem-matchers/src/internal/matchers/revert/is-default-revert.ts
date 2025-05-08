export function isDefaultRevert(data: `0x${string}`): boolean {
  return data.toLowerCase().startsWith("0x08c379a0");
}

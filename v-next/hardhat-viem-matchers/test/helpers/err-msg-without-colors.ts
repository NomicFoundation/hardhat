export function getErrMsgWithoutColors(msg: string): string {
  return msg.replace(/\x1b\[[0-9;]*m/g, "");
}

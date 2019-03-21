import path from "path";

export function join(...args: string[]): string {
  const p = path.join(...args);
  return args.length > 0 && args[0] === "." ? args[0] + path.sep + p : p;
}

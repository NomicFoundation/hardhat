import type { IOptions as GlobOptions } from "glob";
import util from "util";

export async function glob(
  pattern: string,
  options: GlobOptions = {}
): Promise<string[]> {
  const { default: globModule } = await import("glob");
  return util.promisify(globModule)(pattern, { realpath: true, ...options });
}

export function globSync(pattern: string, options: GlobOptions = {}): string[] {
  return require("glob").sync(pattern, { realpath: true, ...options });
}

import type { IOptions as GlobOptions } from "glob";

import * as path from "path";
import util from "util";

/**
 * @deprecated
 */
export async function glob(
  pattern: string,
  options: GlobOptions = {}
): Promise<string[]> {
  const { default: globModule } = await import("glob");
  const files = await util.promisify(globModule)(pattern, options);
  return files.map(path.normalize);
}

/**
 * deprecated
 */
export function globSync(pattern: string, options: GlobOptions = {}): string[] {
  const files = require("glob").sync(pattern, options);
  return files.map(path.normalize);
}

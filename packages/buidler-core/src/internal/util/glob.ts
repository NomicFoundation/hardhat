import util from "util";

export async function glob(pattern: string): Promise<string[]> {
  const { default: globModule } = await import("glob");
  return util.promisify(globModule)(pattern, { realpath: true });
}

export function globSync(pattern: string): string[] {
  return require("glob").sync(pattern, { realpath: true });
}

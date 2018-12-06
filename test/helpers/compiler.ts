export function getLocalCompilerVersion(): string {
  return require("solc/package.json").version;
}

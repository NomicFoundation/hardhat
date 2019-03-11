export function getLocalCompilerVersion(): string {
  return require("solc/package.json").version;
}

export function getDefaultEvmVersion(): string {
  return "petersburg";
}

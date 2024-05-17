export type VyperUserConfig = string | VyperConfig | MultiVyperConfig;

export interface VyperSettings {
  evmVersion?: string;
  optimize?: string | boolean;
}

export interface VyperConfig {
  version: string;
  settings?: VyperSettings;
}

export interface MultiVyperConfig {
  compilers: VyperConfig[];
}

export enum CompilerPlatform {
  LINUX = "linux",
  WINDOWS = "windows",
  MACOS = "darwin",
}

export interface CompilerReleaseAsset {
  name: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  browser_download_url: string;
}

export interface CompilerRelease {
  assets: CompilerReleaseAsset[];
  // eslint-disable-next-line @typescript-eslint/naming-convention
  tag_name: string;
}

export type CompilersList = CompilerRelease[];

export interface VyperBuild {
  version: string;
  compilerPath: string;
}

/**
 * A Vyper file.
 */
export interface ResolvedFile {
  sourceName: string;
  absolutePath: string;
  content: FileContent;
  // IMPORTANT: Mapped to ctime, NOT mtime. mtime isn't updated when the file
  // properties (e.g. its name) are changed, only when its content changes.
  lastModificationDate: Date;
  contentHash: string;
}

/**
 * The content of a Vyper file. Including its raw content, its imports
 * and version pragma directives.
 */
export interface FileContent {
  rawContent: string;
  versionPragma: string;
}

// compiler output
export interface VyperOutput {
  // The compiler version used to generate the output
  version: string;
  [sourceName: `${string}.vy`]: ContractOutput;
  [sourceName: `${string}.v.py`]: ContractOutput;
}

export interface ContractOutput {
  bytecode: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  bytecode_runtime: string;
  abi: string[];
  layout: any;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  source_map: any;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  method_identifiers: {
    [signature: string]: string;
  };
  userdoc: any;
  devdoc: any;
}

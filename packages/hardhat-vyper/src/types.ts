export type VyperUserConfig = string | VyperConfig | MultiVyperConfig;

export interface VyperConfig {
  version: string;
  // settings?: any;
}

export interface MultiVyperConfig {
  compilers: VyperConfig[];
  // overrides?: Record<string, VyperConfig>;
}

export enum CompilerPlatform {
  LINUX = "linux",
  WINDOWS = "windows",
  MACOS = "darwin",
}

export interface CompilerReleaseAsset {
  url: string;
  id: number;
  name: string;
  label: string | null;
  uploader: any;
  state: string;
  size: number;
  browserDownloadUrl: string;
}

interface CompilerRelease {
  url: string;
  id: number;
  author: any;
  name: string;
  draft: boolean;
  prerelease: boolean;
  assets: CompilerReleaseAsset[];
  body: string;
  tagName: string;
}

export type CompilersList = CompilerRelease[];

export interface VyperBuild {
  version: string;
  name: string;
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
  bytecodeRuntime: string;
  abi: string[];
  layout: any;
  sourceMap: any;
  methodIdentifiers: {
    [signature: string]: string;
  };
  userdoc: any;
  devdoc: any;
}

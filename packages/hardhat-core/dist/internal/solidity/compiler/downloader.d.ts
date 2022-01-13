export interface CompilerBuild {
    path: string;
    version: string;
    build: string;
    longVersion: string;
    keccak256: string;
    urls: string[];
    platform: CompilerPlatform;
}
export declare enum CompilerPlatform {
    LINUX = "linux-amd64",
    WINDOWS = "windows-amd64",
    MACOS = "macosx-amd64",
    WASM = "wasm"
}
interface CompilerPath {
    compilerPath: string;
    platform: CompilerPlatform;
}
export interface CompilersList {
    builds: CompilerBuild[];
    releases: {
        [version: string]: string;
    };
    latestRelease: string;
}
declare type CompilerDownloaderOptions = Partial<{
    download: (url: string, destinationFile: string) => Promise<void>;
    forceSolcJs: boolean;
}>;
export declare class CompilerDownloader {
    private readonly _compilersDir;
    private readonly _download;
    private readonly _forceSolcJs;
    constructor(_compilersDir: string, options?: CompilerDownloaderOptions);
    isCompilerDownloaded(version: string): Promise<boolean>;
    verifyCompiler(compilerBuild: CompilerBuild, downloadedFilePath: string): Promise<void>;
    getDownloadedCompilerPath(version: string): Promise<CompilerPath | undefined>;
    getCompilersList(platform: CompilerPlatform, pendingRetries?: number): Promise<CompilersList>;
    getCompilerBuild(version: string): Promise<CompilerBuild>;
    downloadCompilersList(platform: CompilerPlatform): Promise<void>;
    downloadCompiler(compilerBuild: CompilerBuild, downloadedFilePath: string): Promise<void>;
    compilersListExists(platform: CompilerPlatform): Promise<boolean>;
    getCompilersListPath(platform: CompilerPlatform): string;
    private _getDownloadedFilePath;
    private _fetchVersionPath;
    private _versionExists;
    private _getCompilerBuildByPlatform;
    private _fileExists;
    private _getCurrentPlarform;
}
export {};
//# sourceMappingURL=downloader.d.ts.map
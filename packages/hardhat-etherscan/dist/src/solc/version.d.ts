export interface CompilersList {
    releases: {
        [version: string]: string;
    };
    latestRelease: string;
}
export declare function getLongVersion(shortVersion: string): Promise<string>;
export declare function getVersions(): Promise<CompilersList>;
//# sourceMappingURL=version.d.ts.map
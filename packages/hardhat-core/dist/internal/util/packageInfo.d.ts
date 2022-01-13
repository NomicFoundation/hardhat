export declare function getPackageJsonPath(): string;
export declare function getPackageRoot(): string;
export interface PackageJson {
    name: string;
    version: string;
    engines: {
        node: string;
    };
}
export declare function findClosestPackageJson(file: string): string | null;
export declare function getPackageJson(): Promise<PackageJson>;
export declare function getHardhatVersion(): string | null;
//# sourceMappingURL=packageInfo.d.ts.map
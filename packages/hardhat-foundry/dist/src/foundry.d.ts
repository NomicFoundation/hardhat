import { NomicLabsHardhatPluginError } from "hardhat/internal/core/errors";
declare type Remappings = Record<string, string>;
export declare class HardhatFoundryError extends NomicLabsHardhatPluginError {
    constructor(message: string, parent?: Error);
}
export declare function getForgeConfig(): any;
export declare function getRemappings(): Promise<Remappings>;
export declare function installDependency(dependency: string): Promise<void>;
export {};
//# sourceMappingURL=foundry.d.ts.map
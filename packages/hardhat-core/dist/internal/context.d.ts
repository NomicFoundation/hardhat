/// <reference types="node" />
import { ConfigExtender, ExperimentalHardhatNetworkMessageTraceHook, HardhatRuntimeEnvironment } from "../types";
import { ExtenderManager } from "./core/config/extenders";
import { TasksDSL } from "./core/tasks/dsl";
export declare type GlobalWithHardhatContext = typeof global & {
    __hardhatContext: HardhatContext;
};
export declare class HardhatContext {
    static isCreated(): boolean;
    static createHardhatContext(): HardhatContext;
    static getHardhatContext(): HardhatContext;
    static deleteHardhatContext(): void;
    readonly tasksDSL: TasksDSL;
    readonly extendersManager: ExtenderManager;
    environment?: HardhatRuntimeEnvironment;
    readonly configExtenders: ConfigExtender[];
    readonly experimentalHardhatNetworkMessageTraceHooks: ExperimentalHardhatNetworkMessageTraceHook[];
    private _filesLoadedBeforeConfig?;
    private _filesLoadedAfterConfig?;
    setHardhatRuntimeEnvironment(env: HardhatRuntimeEnvironment): void;
    getHardhatRuntimeEnvironment(): HardhatRuntimeEnvironment;
    setConfigLoadingAsStarted(): void;
    setConfigLoadingAsFinished(): void;
    getFilesLoadedDuringConfig(): string[];
}
//# sourceMappingURL=context.d.ts.map
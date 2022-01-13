import { BoundExperimentalHardhatNetworkMessageTraceHook } from "../../../../types";
import { MiningTimer } from "../MiningTimer";
import { HardhatNode } from "../node";
import { ModulesLogger } from "./logger";
export declare class EvmModule {
    private readonly _node;
    private readonly _miningTimer;
    private readonly _logger;
    private readonly _experimentalHardhatNetworkMessageTraceHooks;
    constructor(_node: HardhatNode, _miningTimer: MiningTimer, _logger: ModulesLogger, _experimentalHardhatNetworkMessageTraceHooks?: BoundExperimentalHardhatNetworkMessageTraceHook[]);
    processRequest(method: string, params?: any[]): Promise<any>;
    private _setNextBlockTimestampParams;
    private _setNextBlockTimestampAction;
    private _increaseTimeParams;
    private _increaseTimeAction;
    private _mineParams;
    private _mineAction;
    private _revertParams;
    private _revertAction;
    private _snapshotParams;
    private _snapshotAction;
    private _setAutomineParams;
    private _setAutomineAction;
    private _setIntervalMiningParams;
    private _setIntervalMiningAction;
    private _setBlockGasLimitParams;
    private _setBlockGasLimitAction;
    private _logBlock;
    private _runHardhatNetworkMessageTraceHooks;
}
//# sourceMappingURL=evm.d.ts.map
import { HardhatNode } from "../node";
export declare class DebugModule {
    private readonly _node;
    constructor(_node: HardhatNode);
    processRequest(method: string, params?: any[]): Promise<any>;
    private _traceTransactionParams;
    private _traceTransactionAction;
}
//# sourceMappingURL=debug.d.ts.map
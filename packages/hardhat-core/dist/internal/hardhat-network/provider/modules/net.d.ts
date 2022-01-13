import Common from "@ethereumjs/common";
export declare class NetModule {
    private readonly _common;
    constructor(_common: Common);
    processRequest(method: string, params?: any[]): Promise<any>;
    private _listeningParams;
    private _listeningAction;
    private _peerCountParams;
    private _peerCountAction;
    private _versionParams;
    private _versionAction;
}
//# sourceMappingURL=net.d.ts.map
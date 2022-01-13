import { HardhatNode } from "../node";
export declare class PersonalModule {
    private readonly _node;
    constructor(_node: HardhatNode);
    processRequest(method: string, params?: any[]): Promise<any>;
    private _signParams;
    private _signAction;
}
//# sourceMappingURL=personal.d.ts.map
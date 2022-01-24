import { EtherscanCheckStatusRequest, EtherscanVerifyRequest } from "./EtherscanVerifyContractRequest";
export declare function delay(ms: number): Promise<void>;
export declare function verifyContract(url: string, req: EtherscanVerifyRequest): Promise<EtherscanResponse>;
export declare function getVerificationStatus(url: string, req: EtherscanCheckStatusRequest): Promise<EtherscanResponse>;
export declare class EtherscanResponse {
    readonly status: number;
    readonly message: string;
    constructor(response: any);
    isPending(): boolean;
    isVerificationFailure(): boolean;
    isVerificationSuccess(): boolean;
    isBytecodeMissingInNetworkError(): boolean;
    isOk(): boolean;
}
//# sourceMappingURL=EtherscanService.d.ts.map
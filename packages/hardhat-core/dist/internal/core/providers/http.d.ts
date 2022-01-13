/// <reference types="node" />
import { EventEmitter } from "events";
import { EIP1193Provider, RequestArguments } from "../../../types";
export declare class HttpProvider extends EventEmitter implements EIP1193Provider {
    private readonly _url;
    private readonly _networkName;
    private readonly _extraHeaders;
    private readonly _timeout;
    private _nextRequestId;
    constructor(_url: string, _networkName: string, _extraHeaders?: {
        [name: string]: string;
    }, _timeout?: number);
    get url(): string;
    request(args: RequestArguments): Promise<unknown>;
    /**
     * Sends a batch of requests. Fails if any of them fails.
     */
    sendBatch(batch: Array<{
        method: string;
        params: any[];
    }>): Promise<any[]>;
    private _fetchJsonRpcResponse;
    private _retry;
    private _getJsonRpcRequest;
    private _shouldRetry;
    private _isRateLimitResponse;
    private _getRetryAfterSeconds;
}
//# sourceMappingURL=http.d.ts.map
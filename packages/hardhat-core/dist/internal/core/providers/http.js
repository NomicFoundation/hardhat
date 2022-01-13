"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpProvider = void 0;
const events_1 = require("events");
const constants_1 = require("../../constants");
const jsonrpc_1 = require("../../util/jsonrpc");
const errors_1 = require("../errors");
const errors_list_1 = require("../errors-list");
const errors_2 = require("./errors");
function isErrorResponse(response) {
    return typeof response.error !== "undefined";
}
const MAX_RETRIES = 6;
const MAX_RETRY_AWAIT_SECONDS = 5;
const TOO_MANY_REQUEST_STATUS = 429;
class HttpProvider extends events_1.EventEmitter {
    constructor(_url, _networkName, _extraHeaders = {}, _timeout = 20000) {
        super();
        this._url = _url;
        this._networkName = _networkName;
        this._extraHeaders = _extraHeaders;
        this._timeout = _timeout;
        this._nextRequestId = 1;
    }
    get url() {
        return this._url;
    }
    async request(args) {
        // We create the error here to capture the stack traces at this point,
        // the async call that follows would probably loose of the stack trace
        const error = new errors_2.ProviderError("HttpProviderError", -1);
        const jsonRpcRequest = this._getJsonRpcRequest(args.method, args.params);
        const jsonRpcResponse = await this._fetchJsonRpcResponse(jsonRpcRequest);
        if (isErrorResponse(jsonRpcResponse)) {
            error.message = jsonRpcResponse.error.message;
            error.code = jsonRpcResponse.error.code;
            error.data = jsonRpcResponse.error.data;
            // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
            throw error;
        }
        if (args.method === "hardhat_reset") {
            this.emit(constants_1.HARDHAT_NETWORK_RESET_EVENT);
        }
        if (args.method === "evm_revert") {
            this.emit(constants_1.HARDHAT_NETWORK_REVERT_SNAPSHOT_EVENT);
        }
        return jsonRpcResponse.result;
    }
    /**
     * Sends a batch of requests. Fails if any of them fails.
     */
    async sendBatch(batch) {
        // We create the errors here to capture the stack traces at this point,
        // the async call that follows would probably loose of the stack trace
        const error = new errors_2.ProviderError("HttpProviderError", -1);
        // we need this to sort the responses
        const idToIndexMap = {};
        const requests = batch.map((r, i) => {
            const jsonRpcRequest = this._getJsonRpcRequest(r.method, r.params);
            idToIndexMap[jsonRpcRequest.id] = i;
            return jsonRpcRequest;
        });
        const jsonRpcResponses = await this._fetchJsonRpcResponse(requests);
        for (const response of jsonRpcResponses) {
            if (isErrorResponse(response)) {
                error.message = response.error.message;
                error.code = response.error.code;
                error.data = response.error.data;
                // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
                throw error;
            }
        }
        // We already know that it has this type, but TS can't infer it.
        const responses = jsonRpcResponses;
        // we use the id to sort the responses so that they match the order of the requests
        const sortedResponses = responses
            .map((response) => [idToIndexMap[response.id], response.result])
            .sort(([indexA], [indexB]) => indexA - indexB)
            .map(([, result]) => result);
        return sortedResponses;
    }
    async _fetchJsonRpcResponse(request, retryNumber = 0) {
        const { default: fetch } = await Promise.resolve().then(() => __importStar(require("node-fetch")));
        try {
            const response = await fetch(this._url, {
                method: "POST",
                body: JSON.stringify(request),
                redirect: "follow",
                timeout: process.env.DO_NOT_SET_THIS_ENV_VAR____IS_HARDHAT_CI !== undefined
                    ? 0
                    : this._timeout,
                headers: Object.assign({ "Content-Type": "application/json" }, this._extraHeaders),
            });
            if (this._isRateLimitResponse(response)) {
                // Consume the response stream and discard its result
                // See: https://github.com/node-fetch/node-fetch/issues/83
                const _discarded = await response.text();
                const seconds = this._getRetryAfterSeconds(response);
                if (seconds !== undefined && this._shouldRetry(retryNumber, seconds)) {
                    return await this._retry(request, seconds, retryNumber);
                }
                const url = new URL(this._url);
                // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
                throw new errors_2.ProviderError(`Too Many Requests error received from ${url.hostname}`, -32005 // Limit exceeded according to EIP1474
                );
            }
            return (0, jsonrpc_1.parseJsonResponse)(await response.text());
        }
        catch (error) {
            if (error.code === "ECONNREFUSED") {
                throw new errors_1.HardhatError(errors_list_1.ERRORS.NETWORK.NODE_IS_NOT_RUNNING, { network: this._networkName }, error);
            }
            if (error.type === "request-timeout") {
                throw new errors_1.HardhatError(errors_list_1.ERRORS.NETWORK.NETWORK_TIMEOUT, {}, error);
            }
            // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
            throw error;
        }
    }
    async _retry(request, seconds, retryNumber) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * seconds));
        return this._fetchJsonRpcResponse(request, retryNumber + 1);
    }
    _getJsonRpcRequest(method, params = []) {
        return {
            jsonrpc: "2.0",
            method,
            params,
            id: this._nextRequestId++,
        };
    }
    _shouldRetry(retryNumber, retryAfterSeconds) {
        if (retryNumber > MAX_RETRIES) {
            return false;
        }
        if (retryAfterSeconds > MAX_RETRY_AWAIT_SECONDS) {
            return false;
        }
        return true;
    }
    _isRateLimitResponse(response) {
        return response.status === TOO_MANY_REQUEST_STATUS;
    }
    _getRetryAfterSeconds(response) {
        const header = response.headers.get("Retry-After");
        if (header === undefined || header === null) {
            return undefined;
        }
        const parsed = parseInt(header, 10);
        if (isNaN(parsed)) {
            return undefined;
        }
        return parsed;
    }
}
exports.HttpProvider = HttpProvider;
//# sourceMappingURL=http.js.map
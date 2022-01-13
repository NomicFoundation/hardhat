"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderWrapper = void 0;
const event_emitter_1 = require("../../util/event-emitter");
const errors_1 = require("./errors");
class ProviderWrapper extends event_emitter_1.EventEmitterWrapper {
    constructor(_wrappedProvider) {
        super(_wrappedProvider);
        this._wrappedProvider = _wrappedProvider;
    }
    _getParams(args) {
        const params = args.params;
        if (params === undefined) {
            return [];
        }
        if (!Array.isArray(params)) {
            // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
            throw new errors_1.InvalidInputError("Hardhat Network doesn't support JSON-RPC params sent as an object");
        }
        return params;
    }
}
exports.ProviderWrapper = ProviderWrapper;
//# sourceMappingURL=wrapper.js.map
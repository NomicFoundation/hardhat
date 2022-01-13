"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isForkedNodeConfig = void 0;
function isForkedNodeConfig(config) {
    return "forkConfig" in config && config.forkConfig !== undefined;
}
exports.isForkedNodeConfig = isForkedNodeConfig;
//# sourceMappingURL=node-types.js.map
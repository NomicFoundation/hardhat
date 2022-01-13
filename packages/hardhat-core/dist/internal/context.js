"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HardhatContext = void 0;
const extenders_1 = require("./core/config/extenders");
const errors_1 = require("./core/errors");
const errors_list_1 = require("./core/errors-list");
const dsl_1 = require("./core/tasks/dsl");
const platform_1 = require("./util/platform");
class HardhatContext {
    constructor() {
        this.tasksDSL = new dsl_1.TasksDSL();
        this.extendersManager = new extenders_1.ExtenderManager();
        this.configExtenders = [];
        // NOTE: This is experimental and will be removed. Please contact our team if
        // you are planning to use it.
        this.experimentalHardhatNetworkMessageTraceHooks = [];
    }
    static isCreated() {
        const globalWithHardhatContext = global;
        return globalWithHardhatContext.__hardhatContext !== undefined;
    }
    static createHardhatContext() {
        if (this.isCreated()) {
            throw new errors_1.HardhatError(errors_list_1.ERRORS.GENERAL.CONTEXT_ALREADY_CREATED);
        }
        const globalWithHardhatContext = global;
        const ctx = new HardhatContext();
        globalWithHardhatContext.__hardhatContext = ctx;
        return ctx;
    }
    static getHardhatContext() {
        const globalWithHardhatContext = global;
        const ctx = globalWithHardhatContext.__hardhatContext;
        if (ctx === undefined) {
            throw new errors_1.HardhatError(errors_list_1.ERRORS.GENERAL.CONTEXT_NOT_CREATED);
        }
        return ctx;
    }
    static deleteHardhatContext() {
        const globalAsAny = global;
        globalAsAny.__hardhatContext = undefined;
    }
    setHardhatRuntimeEnvironment(env) {
        if (this.environment !== undefined) {
            throw new errors_1.HardhatError(errors_list_1.ERRORS.GENERAL.CONTEXT_HRE_ALREADY_DEFINED);
        }
        this.environment = env;
    }
    getHardhatRuntimeEnvironment() {
        if (this.environment === undefined) {
            throw new errors_1.HardhatError(errors_list_1.ERRORS.GENERAL.CONTEXT_HRE_NOT_DEFINED);
        }
        return this.environment;
    }
    setConfigLoadingAsStarted() {
        this._filesLoadedBeforeConfig = (0, platform_1.getRequireCachedFiles)();
    }
    setConfigLoadingAsFinished() {
        this._filesLoadedAfterConfig = (0, platform_1.getRequireCachedFiles)();
    }
    getFilesLoadedDuringConfig() {
        // No config was loaded
        if (this._filesLoadedBeforeConfig === undefined) {
            return [];
        }
        (0, errors_1.assertHardhatInvariant)(this._filesLoadedAfterConfig !== undefined, "Config loading was set as started and not finished");
        return arraysDifference(this._filesLoadedAfterConfig, this._filesLoadedBeforeConfig);
    }
}
exports.HardhatContext = HardhatContext;
function arraysDifference(a, b) {
    return a.filter((e) => !b.includes(e));
}
//# sourceMappingURL=context.js.map
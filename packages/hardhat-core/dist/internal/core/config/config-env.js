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
exports.experimentalAddHardhatNetworkMessageTraceHook = exports.extendConfig = exports.extendEnvironment = exports.types = exports.internalTask = exports.subtask = exports.task = void 0;
const context_1 = require("../../context");
const argumentTypes = __importStar(require("../params/argumentTypes"));
function task(name, descriptionOrAction, action) {
    const ctx = context_1.HardhatContext.getHardhatContext();
    const dsl = ctx.tasksDSL;
    if (descriptionOrAction === undefined) {
        return dsl.task(name);
    }
    if (typeof descriptionOrAction !== "string") {
        return dsl.task(name, descriptionOrAction);
    }
    return dsl.task(name, descriptionOrAction, action);
}
exports.task = task;
function subtask(name, descriptionOrAction, action) {
    const ctx = context_1.HardhatContext.getHardhatContext();
    const dsl = ctx.tasksDSL;
    if (descriptionOrAction === undefined) {
        return dsl.subtask(name);
    }
    if (typeof descriptionOrAction !== "string") {
        return dsl.subtask(name, descriptionOrAction);
    }
    return dsl.subtask(name, descriptionOrAction, action);
}
exports.subtask = subtask;
// Backwards compatibility alias
exports.internalTask = subtask;
exports.types = argumentTypes;
/**
 * Register an environment extender what will be run after the
 * Hardhat Runtime Environment is initialized.
 *
 * @param extender A function that receives the Hardhat Runtime
 * Environment.
 */
function extendEnvironment(extender) {
    const ctx = context_1.HardhatContext.getHardhatContext();
    const extenderManager = ctx.extendersManager;
    extenderManager.add(extender);
}
exports.extendEnvironment = extendEnvironment;
function extendConfig(extender) {
    const ctx = context_1.HardhatContext.getHardhatContext();
    ctx.configExtenders.push(extender);
}
exports.extendConfig = extendConfig;
// NOTE: This is experimental and will be removed. Please contact our team
// if you are planning to use it.
function experimentalAddHardhatNetworkMessageTraceHook(hook) {
    const ctx = context_1.HardhatContext.getHardhatContext();
    ctx.experimentalHardhatNetworkMessageTraceHooks.push(hook);
}
exports.experimentalAddHardhatNetworkMessageTraceHook = experimentalAddHardhatNetworkMessageTraceHook;
//# sourceMappingURL=config-env.js.map
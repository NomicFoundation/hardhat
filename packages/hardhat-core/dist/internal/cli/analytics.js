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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Analytics = void 0;
const abort_controller_1 = __importDefault(require("abort-controller"));
const debug_1 = __importDefault(require("debug"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const os_1 = __importDefault(require("os"));
const qs_1 = __importDefault(require("qs"));
const uuid_1 = require("uuid");
const builtinTaskNames = __importStar(require("../../builtin-tasks/task-names"));
const execution_mode_1 = require("../core/execution-mode");
const ci_detection_1 = require("../util/ci-detection");
const global_dir_1 = require("../util/global-dir");
const packageInfo_1 = require("../util/packageInfo");
const log = (0, debug_1.default)("hardhat:core:analytics");
const googleAnalyticsUrl = "https://www.google-analytics.com/collect";
class Analytics {
    constructor({ clientId, telemetryConsent, userType, }) {
        // Hardhat's tracking id. I guess there's no other choice than keeping it here.
        this._trackingId = "UA-117668706-3";
        this._clientId = clientId;
        this._enabled =
            !(0, execution_mode_1.isLocalDev)() && !(0, ci_detection_1.isRunningOnCiServer)() && telemetryConsent === true;
        this._userType = userType;
    }
    static async getInstance(telemetryConsent) {
        const analytics = new Analytics({
            clientId: await getClientId(),
            telemetryConsent,
            userType: getUserType(),
        });
        return analytics;
    }
    /**
     * Attempt to send a hit to Google Analytics using the Measurement Protocol.
     * This function returns immediately after starting the request, returning a function for aborting it.
     * The idea is that we don't want Hardhat tasks to be slowed down by a slow network request, so
     * Hardhat can abort the request if it takes too much time.
     *
     * Trying to abort a successfully completed request is a no-op, so it's always safe to call it.
     *
     * @param taskName The name of the task to be logged
     *
     * @returns The abort function
     */
    async sendTaskHit(taskName) {
        if (this._isABuiltinTaskName(taskName)) {
            taskName = "builtin";
        }
        else {
            taskName = "custom";
        }
        if (!this._enabled) {
            return [() => { }, Promise.resolve()];
        }
        return this._sendHit(await this._taskHit(taskName));
    }
    _isABuiltinTaskName(taskName) {
        return Object.values(builtinTaskNames).includes(taskName);
    }
    async _taskHit(taskName) {
        return {
            // Measurement protocol version.
            v: "1",
            // Hit type, we're only using pageviews for now.
            t: "pageview",
            // Hardhat's tracking Id.
            tid: this._trackingId,
            // Client Id.
            cid: this._clientId,
            // Document path, must start with a '/'.
            dp: `/task/${taskName}`,
            // Host name.
            dh: "cli.hardhat.org",
            // User agent, must be present.
            // We use it to inform Node version used and OS.
            // Example:
            //   Node/v8.12.0 (Darwin 17.7.0)
            ua: getUserAgent(),
            // We're using the following values (Campaign source, Campaign medium) to track
            // whether the user is a Developer or CI, as Custom Dimensions are not working for us atm.
            cs: this._userType,
            cm: "User Type",
            // We're using custom dimensions for tracking different user projects, and user types (Developer/CI).
            //
            // See the following link for docs on these paremeters:
            // https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#pr_cd_
            //
            // See the following link for setting up our custom dimensions in the Google Analytics dashboard
            // https://support.google.com/tagmanager/answer/6164990
            //
            // Custom dimension 1: Project Id
            cd1: "hardhat-project",
            // Custom dimension 2: User type
            //   Possible values: "CI", "Developer".
            cd2: this._userType,
            // Custom dimension 3: Hardhat Version
            //   Example: "Hardhat 1.0.0".
            cd3: await getHardhatVersion(),
        };
    }
    _sendHit(hit) {
        log(`Sending hit for ${hit.dp}`);
        const controller = new abort_controller_1.default();
        const abortAnalytics = () => {
            log(`Aborting hit for ${JSON.stringify(hit.dp)}`);
            controller.abort();
        };
        const hitPayload = qs_1.default.stringify(hit);
        log(`Hit payload: ${JSON.stringify(hit)}`);
        const hitPromise = (0, node_fetch_1.default)(googleAnalyticsUrl, {
            body: hitPayload,
            method: "POST",
            signal: controller.signal,
        })
            .then(() => {
            log(`Hit for ${JSON.stringify(hit.dp)} sent successfully`);
        })
            // We're not really interested in handling failed analytics requests
            .catch(() => {
            log("Hit request failed");
        });
        return [abortAnalytics, hitPromise];
    }
}
exports.Analytics = Analytics;
async function getClientId() {
    var _a;
    let clientId = await (0, global_dir_1.readAnalyticsId)();
    if (clientId === undefined) {
        clientId =
            (_a = (await (0, global_dir_1.readSecondLegacyAnalyticsId)())) !== null && _a !== void 0 ? _a : (await (0, global_dir_1.readFirstLegacyAnalyticsId)());
        if (clientId === undefined) {
            log("Client Id not found, generating a new one");
            clientId = (0, uuid_1.v4)();
        }
        await (0, global_dir_1.writeAnalyticsId)(clientId);
    }
    return clientId;
}
function getUserType() {
    return (0, ci_detection_1.isRunningOnCiServer)() ? "CI" : "Developer";
}
/**
 * At the moment, we couldn't find a reliably way to report the OS () in Node,
 * as the versions reported by the various `os` APIs (`os.platform()`, `os.type()`, etc)
 * return values different to those expected by Google Analytics
 * We decided to take the compromise of just reporting the OS Platform (OSX/Linux/Windows) for now (version information is bogus for now).
 */
function getOperatingSystem() {
    switch (os_1.default.type()) {
        case "Windows_NT":
            return "(Windows NT 6.1; Win64; x64)";
        case "Darwin":
            return "(Macintosh; Intel Mac OS X 10_13_6)";
        case "Linux":
            return "(X11; Linux x86_64)";
        default:
            return "(Unknown)";
    }
}
function getUserAgent() {
    return `Node/${process.version} ${getOperatingSystem()}`;
}
async function getHardhatVersion() {
    const { version } = await (0, packageInfo_1.getPackageJson)();
    return `Hardhat ${version}`;
}
//# sourceMappingURL=analytics.js.map
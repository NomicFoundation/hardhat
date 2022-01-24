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
exports.getVersions = exports.getLongVersion = void 0;
const plugins_1 = require("hardhat/plugins");
const constants_1 = require("../constants");
const COMPILERS_LIST_URL = "https://solc-bin.ethereum.org/bin/list.json";
// TODO: this could be retrieved from the hardhat config instead.
async function getLongVersion(shortVersion) {
    const versions = await getVersions();
    const fullVersion = versions.releases[shortVersion];
    if (fullVersion === undefined || fullVersion === "") {
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, "Given solc version doesn't exist");
    }
    return fullVersion.replace(/(soljson-)(.*)(.js)/, "$2");
}
exports.getLongVersion = getLongVersion;
async function getVersions() {
    try {
        const { default: fetch } = await Promise.resolve().then(() => __importStar(require("node-fetch")));
        // It would be better to query an etherscan API to get this list but there's no such API yet.
        const response = await fetch(COMPILERS_LIST_URL);
        if (!response.ok) {
            const responseText = await response.text();
            throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `HTTP response is not ok. Status code: ${response.status} Response text: ${responseText}`);
        }
        return await response.json();
    }
    catch (error) {
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `Failed to obtain list of solc versions. Reason: ${error.message}`, error);
    }
}
exports.getVersions = getVersions;
//# sourceMappingURL=version.js.map
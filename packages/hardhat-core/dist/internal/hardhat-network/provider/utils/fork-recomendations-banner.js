"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showForkRecommendationsBannerIfNecessary = void 0;
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
function getAlreadyShownFilePath(forkCachePath) {
    return path_1.default.join(forkCachePath, "recommendations-already-shown.json");
}
function displayBanner() {
    console.warn(chalk_1.default.yellow(`You're running a network fork starting from the latest block.
Performance may degrade due to fetching data from the network with each run.
If connecting to an archival node (e.g. Alchemy), we strongly recommend setting
blockNumber to a fixed value to increase performance with a local cache.`));
}
async function showForkRecommendationsBannerIfNecessary(currentNetworkConfig, forkCachePath) {
    var _a, _b;
    if (!("forking" in currentNetworkConfig)) {
        return;
    }
    if (((_a = currentNetworkConfig.forking) === null || _a === void 0 ? void 0 : _a.enabled) !== true) {
        return;
    }
    if (((_b = currentNetworkConfig.forking) === null || _b === void 0 ? void 0 : _b.blockNumber) !== undefined) {
        return;
    }
    const shownPath = getAlreadyShownFilePath(forkCachePath);
    if (await fs_extra_1.default.pathExists(shownPath)) {
        return;
    }
    displayBanner();
    await fs_extra_1.default.ensureDir(path_1.default.dirname(shownPath));
    await fs_extra_1.default.writeJSON(shownPath, true);
}
exports.showForkRecommendationsBannerIfNecessary = showForkRecommendationsBannerIfNecessary;
//# sourceMappingURL=fork-recomendations-banner.js.map
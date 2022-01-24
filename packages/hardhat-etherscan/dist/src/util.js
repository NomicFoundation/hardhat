"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildContractUrl = void 0;
function buildContractUrl(browserURL, contractAddress) {
    const normalizedBrowserURL = browserURL.trim().replace(/\/$/, "");
    return `${normalizedBrowserURL}/address/${contractAddress}#code`;
}
exports.buildContractUrl = buildContractUrl;
//# sourceMappingURL=util.js.map
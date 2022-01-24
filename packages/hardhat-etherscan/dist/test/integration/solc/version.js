"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const version_1 = require("../../../src/solc/version");
describe("solc version retrieval integration tests", () => {
    it("verify full solc version is returned", async () => {
        const fullVersion = await (0, version_1.getLongVersion)("0.5.1");
        chai_1.assert.equal(fullVersion, "v0.5.1+commit.c8a2cb62");
    });
});
//# sourceMappingURL=version.js.map
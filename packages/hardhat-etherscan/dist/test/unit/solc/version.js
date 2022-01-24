"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const plugins_1 = require("hardhat/plugins");
const nock_1 = __importDefault(require("nock"));
const version_1 = require("../../../src/solc/version");
describe("solc version retrieval unit tests", function () {
    before(function () {
        nock_1.default.disableNetConnect();
    });
    after(function () {
        nock_1.default.enableNetConnect();
    });
    it("solc version with commit is returned", async () => {
        (0, nock_1.default)("https://solc-bin.ethereum.org")
            .get("/bin/list.json")
            .reply(200, {
            releases: {
                "0.5.1": "soljson-v0.5.1-commitsomething.js",
            },
        });
        const fullVersion = await (0, version_1.getLongVersion)("0.5.1");
        chai_1.assert.equal(fullVersion, "v0.5.1-commitsomething");
    });
    it("an exception is thrown if there was an error sending request", async () => {
        (0, nock_1.default)("https://solc-bin.ethereum.org").get("/bin/list.json").reply(404);
        return (0, version_1.getLongVersion)("0.5.1")
            .then(() => chai_1.assert.fail("Should fail when response has status 404."))
            .catch((error) => {
            chai_1.assert.instanceOf(error, plugins_1.HardhatPluginError);
            (0, chai_1.expect)(error.message)
                .to.be.a("string")
                .and.include("Failed to obtain list of solc versions.");
        });
    });
    it("an exception is thrown if the specified version doesn't exist", async () => {
        (0, nock_1.default)("https://solc-bin.ethereum.org")
            .get("/bin/list.json")
            .reply(200, {
            releases: {
                "0.5.2": "soljson-v0.5.2-commitsomething.js",
            },
        });
        return (0, version_1.getLongVersion)("0.5.1")
            .then(() => chai_1.assert.fail("Should fail when response is missing the sought compiler version."))
            .catch((error) => {
            chai_1.assert.instanceOf(error, plugins_1.HardhatPluginError);
            (0, chai_1.expect)(error.message)
                .to.be.a("string")
                .and.include("Given solc version doesn't exist");
        });
    });
});
//# sourceMappingURL=version.js.map
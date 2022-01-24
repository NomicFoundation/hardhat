"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomString = exports.deployContract = exports.useEnvironment = void 0;
const plugins_testing_1 = require("hardhat/plugins-testing");
const path_1 = __importDefault(require("path"));
function useEnvironment(fixtureProjectName, networkName = "hardhat") {
    beforeEach("Loading hardhat environment", function () {
        process.chdir(path_1.default.join(__dirname, "fixture-projects", fixtureProjectName));
        process.env.HARDHAT_NETWORK = networkName;
        this.env = require("hardhat");
    });
    afterEach("Resetting hardhat", function () {
        (0, plugins_testing_1.resetHardhatContext)();
    });
}
exports.useEnvironment = useEnvironment;
async function deployContract(contractName, constructorArguments, { ethers }, confirmations = 5, options = {}) {
    if (options.signer === undefined) {
        if (process.env.WALLET_PRIVATE_KEY === undefined) {
            throw new Error("No wallet or signer defined for deployment.");
        }
        options.signer = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, ethers.provider);
    }
    const factory = await ethers.getContractFactory(contractName, options);
    const contract = await factory.deploy(...constructorArguments);
    await contract.deployTransaction.wait(confirmations);
    return contract.address;
}
exports.deployContract = deployContract;
function getRandomString({ ethers }) {
    return ethers.Wallet.createRandom().address;
}
exports.getRandomString = getRandomString;
//# sourceMappingURL=helpers.js.map
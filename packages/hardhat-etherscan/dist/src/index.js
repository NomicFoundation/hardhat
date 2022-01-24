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
const task_names_1 = require("hardhat/builtin-tasks/task-names");
const config_1 = require("hardhat/config");
const plugins_1 = require("hardhat/plugins");
const contract_names_1 = require("hardhat/utils/contract-names");
const path_1 = __importDefault(require("path"));
const semver_1 = __importDefault(require("semver"));
const ABIEncoder_1 = require("./ABIEncoder");
const config_2 = require("./config");
const constants_1 = require("./constants");
const EtherscanService_1 = require("./etherscan/EtherscanService");
const EtherscanVerifyContractRequest_1 = require("./etherscan/EtherscanVerifyContractRequest");
const ChainConfig_1 = require("./ChainConfig");
const prober_1 = require("./network/prober");
const resolveEtherscanApiKey_1 = require("./resolveEtherscanApiKey");
const bytecode_1 = require("./solc/bytecode");
const libraries_1 = require("./solc/libraries");
const metadata_1 = require("./solc/metadata");
const version_1 = require("./solc/version");
require("./type-extensions");
const util_1 = require("./util");
(0, config_1.extendConfig)(config_2.etherscanConfigExtender);
const verify = async ({ address, constructorArgsParams, constructorArgs: constructorArgsModule, contract, libraries: librariesModule, }, { run }) => {
    const constructorArguments = await run(constants_1.TASK_VERIFY_GET_CONSTRUCTOR_ARGUMENTS, {
        constructorArgsModule,
        constructorArgsParams,
    });
    const libraries = await run(constants_1.TASK_VERIFY_GET_LIBRARIES, {
        librariesModule,
    });
    return run(constants_1.TASK_VERIFY_VERIFY, {
        address,
        constructorArguments,
        contract,
        libraries,
    });
};
const verifySubtask = async ({ address, constructorArguments, contract: contractFQN, libraries }, { config, network, run }) => {
    var _a;
    const { etherscan } = config;
    const { isAddress } = await Promise.resolve().then(() => __importStar(require("@ethersproject/address")));
    if (!isAddress(address)) {
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `${address} is an invalid address.`);
    }
    // This can only happen if the subtask is invoked from within Hardhat by a user script or another task.
    if (!Array.isArray(constructorArguments)) {
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `The constructorArguments parameter should be an array.
If your constructor has no arguments pass an empty array. E.g:

  await run("${constants_1.TASK_VERIFY_VERIFY}", {
    <other args>,
    constructorArguments: []
  };`);
    }
    const compilerVersions = await run(constants_1.TASK_VERIFY_GET_COMPILER_VERSIONS);
    const { network: verificationNetwork, urls: etherscanAPIEndpoints, } = await run(constants_1.TASK_VERIFY_GET_ETHERSCAN_ENDPOINT);
    const etherscanAPIKey = (0, resolveEtherscanApiKey_1.resolveEtherscanApiKey)(etherscan, verificationNetwork);
    const deployedBytecodeHex = await (0, prober_1.retrieveContractBytecode)(address, network.provider, network.name);
    const deployedBytecode = new bytecode_1.Bytecode(deployedBytecodeHex);
    const inferredSolcVersion = deployedBytecode.getInferredSolcVersion();
    const matchingCompilerVersions = compilerVersions.filter((version) => {
        return semver_1.default.satisfies(version, inferredSolcVersion);
    });
    if (matchingCompilerVersions.length === 0 &&
        // don't error if the bytecode appears to be OVM bytecode, because we can't infer a specific OVM solc version from the bytecode
        !deployedBytecode.isOvmInferred()) {
        let configuredCompilersFragment;
        if (compilerVersions.length > 1) {
            configuredCompilersFragment = `your configured compiler versions are: ${compilerVersions.join(", ")}`;
        }
        else {
            configuredCompilersFragment = `your configured compiler version is: ${compilerVersions[0]}`;
        }
        const message = `The contract you want to verify was compiled with solidity ${inferredSolcVersion}, but ${configuredCompilersFragment}.

Possible causes are:
  - You are not in the same commit that was used to deploy the contract.
  - Wrong compiler version selected in hardhat config.
  - The given address is wrong.
  - The selected network (${network.name}) is wrong.`;
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, message);
    }
    // Make sure that contract artifacts are up-to-date.
    await run(task_names_1.TASK_COMPILE);
    const contractInformation = await run(constants_1.TASK_VERIFY_GET_CONTRACT_INFORMATION, {
        contractFQN,
        deployedBytecode,
        matchingCompilerVersions,
        libraries,
    });
    // Override solc version based on hardhat config if verifying for the OVM. This is used instead of fetching the
    // full version name from a solc bin JSON file (as is done for EVM solc in src/solc/version.ts) because it's
    // simpler and avoids a network request we don't need. This is ok because the solc version specified in the OVM
    // config always equals the full solc version
    if (deployedBytecode.isOvmInferred()) {
        // We cast to this custom type here instead of using `extendConfig` to avoid always mutating the HardhatConfig
        // type. We don't want that type to always contain the `ovm` field, because users only using hardhat-etherscan
        // without the Optimism plugin should not have that field in their type definitions
        const configCopy = Object.assign({}, config);
        const ovmSolcVersion = (_a = configCopy.ovm) === null || _a === void 0 ? void 0 : _a.solcVersion;
        if (ovmSolcVersion === undefined) {
            const message = `It looks like you are verifying an OVM contract, but do not have an OVM solcVersion specified in the hardhat config.`;
            throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, message);
        }
        contractInformation.solcVersion = `v${ovmSolcVersion}`; // Etherscan requires the leading `v` before the version string
    }
    const deployArgumentsEncoded = await (0, ABIEncoder_1.encodeArguments)(contractInformation.contract.abi, contractInformation.sourceName, contractInformation.contractName, constructorArguments);
    // If OVM, the full version string was already read from the hardhat config. If solc, get the full version string
    const solcFullVersion = deployedBytecode.isOvmInferred()
        ? contractInformation.solcVersion
        : await (0, version_1.getLongVersion)(contractInformation.solcVersion);
    const minimumBuild = await run(constants_1.TASK_VERIFY_GET_MINIMUM_BUILD, {
        sourceName: contractInformation.sourceName,
    });
    const success = await run(constants_1.TASK_VERIFY_VERIFY_MINIMUM_BUILD, {
        minimumBuild,
        contractInformation,
        etherscanAPIEndpoints,
        address,
        etherscanAPIKey,
        solcFullVersion,
        deployArgumentsEncoded,
    });
    if (success) {
        return;
    }
    // Fallback verification
    const verificationStatus = await attemptVerification(etherscanAPIEndpoints, contractInformation, address, etherscanAPIKey, contractInformation.compilerInput, solcFullVersion, deployArgumentsEncoded);
    if (verificationStatus.isVerificationSuccess()) {
        const contractURL = (0, util_1.buildContractUrl)(etherscanAPIEndpoints.browserURL, address);
        console.log(`Successfully verified full build of contract ${contractInformation.contractName} on Etherscan.
${contractURL}`);
        return;
    }
    let errorMessage = `The contract verification failed.
Reason: ${verificationStatus.message}`;
    if (contractInformation.undetectableLibraries.length > 0) {
        const undetectableLibraryNames = contractInformation.undetectableLibraries
            .map(({ sourceName, libName }) => `${sourceName}:${libName}`)
            .map((x) => `  * ${x}`)
            .join("\n");
        errorMessage += `
This contract makes use of libraries whose addresses are undetectable by the plugin.
Keep in mind that this verification failure may be due to passing in the wrong
address for one of these libraries:
${undetectableLibraryNames}`;
    }
    throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, errorMessage);
};
(0, config_1.subtask)(constants_1.TASK_VERIFY_GET_CONSTRUCTOR_ARGUMENTS)
    .addParam("constructorArgsParams", undefined, undefined, config_1.types.any)
    .addOptionalParam("constructorArgsModule", undefined, undefined, config_1.types.inputFile)
    .setAction(async ({ constructorArgsModule, constructorArgsParams, }) => {
    if (typeof constructorArgsModule !== "string") {
        return constructorArgsParams;
    }
    const constructorArgsModulePath = path_1.default.resolve(process.cwd(), constructorArgsModule);
    try {
        const constructorArguments = (await Promise.resolve().then(() => __importStar(require(constructorArgsModulePath))))
            .default;
        if (!Array.isArray(constructorArguments)) {
            throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `The module ${constructorArgsModulePath} doesn't export a list. The module should look like this:

  module.exports = [ arg1, arg2, ... ];`);
        }
        return constructorArguments;
    }
    catch (error) {
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `Importing the module for the constructor arguments list failed.
Reason: ${error.message}`, error);
    }
});
(0, config_1.subtask)(constants_1.TASK_VERIFY_GET_LIBRARIES)
    .addOptionalParam("librariesModule", undefined, undefined, config_1.types.inputFile)
    .setAction(async ({ librariesModule, }) => {
    if (typeof librariesModule !== "string") {
        return {};
    }
    const librariesModulePath = path_1.default.resolve(process.cwd(), librariesModule);
    try {
        const libraries = (await Promise.resolve().then(() => __importStar(require(librariesModulePath)))).default;
        if (typeof libraries !== "object" || Array.isArray(libraries)) {
            throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `The module ${librariesModulePath} doesn't export a dictionary. The module should look like this:

  module.exports = { lib1: "0x...", lib2: "0x...", ... };`);
        }
        return libraries;
    }
    catch (error) {
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `Importing the module for the libraries dictionary failed.
Reason: ${error.message}`, error);
    }
});
async function attemptVerification(etherscanAPIEndpoints, contractInformation, contractAddress, etherscanAPIKey, compilerInput, solcFullVersion, deployArgumentsEncoded) {
    // Ensure the linking information is present in the compiler input;
    compilerInput.settings.libraries = contractInformation.libraryLinks;
    const request = (0, EtherscanVerifyContractRequest_1.toVerifyRequest)({
        apiKey: etherscanAPIKey,
        contractAddress,
        sourceCode: JSON.stringify(compilerInput),
        sourceName: contractInformation.sourceName,
        contractName: contractInformation.contractName,
        compilerVersion: solcFullVersion,
        constructorArguments: deployArgumentsEncoded,
    });
    const response = await (0, EtherscanService_1.verifyContract)(etherscanAPIEndpoints.apiURL, request);
    console.log(`Successfully submitted source code for contract
${contractInformation.sourceName}:${contractInformation.contractName} at ${contractAddress}
for verification on the block explorer. Waiting for verification result...
`);
    const pollRequest = (0, EtherscanVerifyContractRequest_1.toCheckStatusRequest)({
        apiKey: etherscanAPIKey,
        guid: response.message,
    });
    // Compilation is bound to take some time so there's no sense in requesting status immediately.
    await (0, EtherscanService_1.delay)(700);
    const verificationStatus = await (0, EtherscanService_1.getVerificationStatus)(etherscanAPIEndpoints.apiURL, pollRequest);
    if (verificationStatus.isVerificationFailure() ||
        verificationStatus.isVerificationSuccess()) {
        return verificationStatus;
    }
    // Reaching this point shouldn't be possible unless the API is behaving in a new way.
    throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `The API responded with an unexpected message.
Contract verification may have succeeded and should be checked manually.
Message: ${verificationStatus.message}`, undefined, true);
}
const getMinimumBuild = async function ({ sourceName }, { run }) {
    const dependencyGraph = await run(task_names_1.TASK_COMPILE_SOLIDITY_GET_DEPENDENCY_GRAPH, { sourceNames: [sourceName] });
    const resolvedFiles = dependencyGraph
        .getResolvedFiles()
        .filter((resolvedFile) => {
        return resolvedFile.sourceName === sourceName;
    });
    assertHardhatPluginInvariant(resolvedFiles.length === 1, `The plugin found an unexpected number of files for this contract.`);
    const compilationJob = await run(task_names_1.TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOB_FOR_FILE, {
        dependencyGraph,
        file: resolvedFiles[0],
    });
    const build = await run(task_names_1.TASK_COMPILE_SOLIDITY_COMPILE_JOB, {
        compilationJob,
        compilationJobs: [compilationJob],
        compilationJobIndex: 0,
        emitsArtifacts: false,
        quiet: true,
    });
    return build;
};
async function inferContract(artifacts, network, matchingCompilerVersions, deployedBytecode) {
    const contractMatches = await (0, bytecode_1.lookupMatchingBytecode)(artifacts, matchingCompilerVersions, deployedBytecode);
    if (contractMatches.length === 0) {
        const message = `The address provided as argument contains a contract, but its bytecode doesn't match any of your local contracts.

Possible causes are:
  - Contract code changed after the deployment was executed. This includes code for seemingly unrelated contracts.
  - A solidity file was added, moved, deleted or renamed after the deployment was executed. This includes files for seemingly unrelated contracts.
  - Solidity compiler settings were modified after the deployment was executed (like the optimizer, target EVM, etc.).
  - The given address is wrong.
  - The selected network (${network.name}) is wrong.`;
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, message);
    }
    if (contractMatches.length > 1) {
        const nameList = contractMatches
            .map((contract) => {
            return `${contract.sourceName}:${contract.contractName}`;
        })
            .map((fqName) => `  * ${fqName}`)
            .join("\n");
        const message = `More than one contract was found to match the deployed bytecode.
Please use the contract parameter with one of the following contracts:
${nameList}

For example:

  hardhat verify --contract contracts/Example.sol:ExampleContract <other args>

If you are running the verify subtask from within Hardhat instead:

  await run("${constants_1.TASK_VERIFY_VERIFY}", {
    <other args>,
    contract: "contracts/Example.sol:ExampleContract"
  };`;
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, message, undefined, true);
    }
    return contractMatches[0];
}
(0, config_1.subtask)(constants_1.TASK_VERIFY_GET_COMPILER_VERSIONS).setAction(async (_, { config }) => {
    const compilerVersions = config.solidity.compilers.map((c) => c.version);
    if (config.solidity.overrides !== undefined) {
        for (const { version } of Object.values(config.solidity.overrides)) {
            compilerVersions.push(version);
        }
    }
    // Etherscan only supports solidity versions higher than or equal to v0.4.11.
    // See https://etherscan.io/solcversions
    const supportedSolcVersionRange = ">=0.4.11";
    if (compilerVersions.some((version) => {
        return !semver_1.default.satisfies(version, supportedSolcVersionRange);
    })) {
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `Etherscan only supports compiler versions 0.4.11 and higher.
See https://etherscan.io/solcversions for more information.`);
    }
    return compilerVersions;
});
(0, config_1.subtask)(constants_1.TASK_VERIFY_GET_ETHERSCAN_ENDPOINT).setAction(async (_, { network }) => (0, prober_1.getEtherscanEndpoints)(network.provider, network.name, ChainConfig_1.chainConfig));
(0, config_1.subtask)(constants_1.TASK_VERIFY_GET_CONTRACT_INFORMATION)
    .addParam("deployedBytecode", undefined, undefined, config_1.types.any)
    .addParam("matchingCompilerVersions", undefined, undefined, config_1.types.any)
    .addParam("libraries", undefined, undefined, config_1.types.any)
    .addOptionalParam("contractFQN", undefined, undefined, config_1.types.string)
    .setAction(async ({ contractFQN, deployedBytecode, matchingCompilerVersions, libraries, }, { network, artifacts }) => {
    let contractInformation;
    if (contractFQN !== undefined) {
        // Check this particular contract
        if (!(0, contract_names_1.isFullyQualifiedName)(contractFQN)) {
            throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `A valid fully qualified name was expected. Fully qualified names look like this: "contracts/AContract.sol:TheContract"
Instead, this name was received: ${contractFQN}`);
        }
        if (!(await artifacts.artifactExists(contractFQN))) {
            throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `The contract ${contractFQN} is not present in your project.`);
        }
        // Process BuildInfo here to check version and throw an error if unexpected version is found.
        const buildInfo = await artifacts.getBuildInfo(contractFQN);
        if (buildInfo === undefined) {
            throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `The contract ${contractFQN} is present in your project, but we couldn't find its sources.
Please make sure that it has been compiled by Hardhat and that it is written in Solidity.`);
        }
        if (!matchingCompilerVersions.includes(buildInfo.solcVersion) &&
            !deployedBytecode.isOvmInferred()) {
            const inferredSolcVersion = deployedBytecode.getInferredSolcVersion();
            let versionDetails;
            if (isVersionRange(inferredSolcVersion)) {
                versionDetails = `a solidity version in the range ${inferredSolcVersion}`;
            }
            else {
                versionDetails = `the solidity version ${inferredSolcVersion}`;
            }
            throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `The contract ${contractFQN} is being compiled with ${buildInfo.solcVersion}.
However, the contract found in the address provided as argument has its bytecode marked with ${versionDetails}.

Possible causes are:
  - Solidity compiler version settings were modified after the deployment was executed.
  - The given address is wrong.
  - The selected network (${network.name}) is wrong.`);
        }
        const { sourceName, contractName } = (0, contract_names_1.parseFullyQualifiedName)(contractFQN);
        contractInformation = await (0, bytecode_1.extractMatchingContractInformation)(sourceName, contractName, buildInfo, deployedBytecode);
        if (contractInformation === null) {
            throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `The address provided as argument contains a contract, but its bytecode doesn't match the contract ${contractFQN}.

Possible causes are:
  - Contract code changed after the deployment was executed. This includes code for seemingly unrelated contracts.
  - A solidity file was added, moved, deleted or renamed after the deployment was executed. This includes files for seemingly unrelated contracts.
  - Solidity compiler settings were modified after the deployment was executed (like the optimizer, target EVM, etc.).
  - The given address is wrong.
  - The selected network (${network.name}) is wrong.`);
        }
    }
    else {
        // Infer the contract
        contractInformation = await inferContract(artifacts, network, matchingCompilerVersions, deployedBytecode);
    }
    const { libraryLinks, undetectableLibraries } = await (0, libraries_1.getLibraryLinks)(contractInformation, libraries);
    return Object.assign(Object.assign({}, contractInformation), { libraryLinks,
        undetectableLibraries });
});
(0, config_1.subtask)(constants_1.TASK_VERIFY_VERIFY_MINIMUM_BUILD)
    .addParam("minimumBuild", undefined, undefined, config_1.types.any)
    .addParam("contractInformation", undefined, undefined, config_1.types.any)
    .addParam("etherscanAPIEndpoints", undefined, undefined, config_1.types.any)
    .addParam("address", undefined, undefined, config_1.types.string)
    .addParam("etherscanAPIKey", undefined, undefined, config_1.types.string)
    .addParam("solcFullVersion", undefined, undefined, config_1.types.string)
    .addParam("deployArgumentsEncoded", undefined, undefined, config_1.types.string)
    .setAction(async ({ minimumBuild, contractInformation, etherscanAPIEndpoints, address, etherscanAPIKey, solcFullVersion, deployArgumentsEncoded, }) => {
    const minimumBuildContractBytecode = minimumBuild.output.contracts[contractInformation.sourceName][contractInformation.contractName].evm.deployedBytecode.object;
    const matchedBytecode = contractInformation.compilerOutput.contracts[contractInformation.sourceName][contractInformation.contractName].evm.deployedBytecode.object;
    if (minimumBuildContractBytecode === matchedBytecode) {
        const minimumBuildVerificationStatus = await attemptVerification(etherscanAPIEndpoints, contractInformation, address, etherscanAPIKey, minimumBuild.input, solcFullVersion, deployArgumentsEncoded);
        if (minimumBuildVerificationStatus.isVerificationSuccess()) {
            const contractURL = (0, util_1.buildContractUrl)(etherscanAPIEndpoints.browserURL, address);
            console.log(`Successfully verified contract ${contractInformation.contractName} on Etherscan.
${contractURL}`);
            return true;
        }
        console.log(`We tried verifying your contract ${contractInformation.contractName} without including any unrelated one, but it failed.
Trying again with the full solc input used to compile and deploy it.
This means that unrelated contracts may be displayed on Etherscan...
`);
    }
    else {
        console.log(`Compiling your contract excluding unrelated contracts did not produce identical bytecode.
Trying again with the full solc input used to compile and deploy it.
This means that unrelated contracts may be displayed on Etherscan...
`);
    }
    return false;
});
(0, config_1.subtask)(constants_1.TASK_VERIFY_GET_MINIMUM_BUILD)
    .addParam("sourceName", undefined, undefined, config_1.types.string)
    .setAction(getMinimumBuild);
(0, config_1.task)(constants_1.TASK_VERIFY, "Verifies contract on Etherscan")
    .addPositionalParam("address", "Address of the smart contract to verify")
    .addOptionalParam("constructorArgs", "File path to a javascript module that exports the list of arguments.", undefined, config_1.types.inputFile)
    .addOptionalParam("contract", "Fully qualified name of the contract to verify. " +
    "Skips automatic detection of the contract. " +
    "Use if the deployed bytecode matches more than one contract in your project.")
    .addOptionalParam("libraries", "File path to a javascript module that exports the dictionary of library addresses for your contract. " +
    "Use if there are undetectable library addresses in your contract. " +
    "Library addresses are undetectable if they are only used in the constructor for your contract.", undefined, config_1.types.inputFile)
    .addOptionalVariadicPositionalParam("constructorArgsParams", "Contract constructor arguments. Ignored if the --constructor-args option is used.", [])
    .setAction(verify);
(0, config_1.subtask)(constants_1.TASK_VERIFY_VERIFY)
    .addParam("address", undefined, undefined, config_1.types.string)
    .addOptionalParam("constructorArguments", undefined, [], config_1.types.any)
    .addOptionalParam("contract", undefined, undefined, config_1.types.string)
    .addOptionalParam("libraries", undefined, {}, config_1.types.any)
    .setAction(verifySubtask);
function assertHardhatPluginInvariant(invariant, message) {
    if (!invariant) {
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, message, undefined, true);
    }
}
function isVersionRange(version) {
    return (version === metadata_1.METADATA_ABSENT_VERSION_RANGE ||
        version === metadata_1.METADATA_PRESENT_SOLC_NOT_FOUND_VERSION_RANGE);
}
//# sourceMappingURL=index.js.map
import {
  TASK_COMPILE,
  TASK_COMPILE_SOLIDITY_COMPILE_JOB,
  TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOB_FOR_FILE,
  TASK_COMPILE_SOLIDITY_GET_DEPENDENCY_GRAPH,
} from "hardhat/builtin-tasks/task-names";
import { extendConfig, subtask, task, types } from "hardhat/config";
import {
  HARDHAT_NETWORK_NAME,
  NomicLabsHardhatPluginError,
} from "hardhat/plugins";
import {
  ActionType,
  Artifacts,
  CompilationJob,
  CompilerInput,
  CompilerOutput,
  DependencyGraph,
  Network,
} from "hardhat/types";
import {
  isFullyQualifiedName,
  parseFullyQualifiedName,
} from "hardhat/utils/contract-names";
import path from "path";
import semver from "semver";

import { encodeArguments } from "./ABIEncoder";
import { etherscanConfigExtender } from "./config";
import {
  pluginName,
  TASK_VERIFY,
  TASK_VERIFY_GET_COMPILER_VERSIONS,
  TASK_VERIFY_GET_CONSTRUCTOR_ARGUMENTS,
  TASK_VERIFY_GET_CONTRACT_INFORMATION,
  TASK_VERIFY_GET_ETHERSCAN_ENDPOINT,
  TASK_VERIFY_GET_MINIMUM_BUILD,
  TASK_VERIFY_VERIFY,
  TASK_VERIFY_VERIFY_MINIMUM_BUILD,
} from "./constants";
import {
  delay,
  getVerificationStatus,
  verifyContract,
} from "./etherscan/EtherscanService";
import {
  toCheckStatusRequest,
  toVerifyRequest,
} from "./etherscan/EtherscanVerifyContractRequest";
import {
  getEtherscanEndpoint,
  retrieveContractBytecode,
} from "./network/prober";
import {
  Bytecode,
  ContractInformation,
  extractMatchingContractInformation,
  lookupMatchingBytecode,
} from "./solc/bytecode";
import {
  METADATA_ABSENT_VERSION_RANGE,
  METADATA_PRESENT_SOLC_NOT_FOUND_VERSION_RANGE,
} from "./solc/metadata";
import { getLongVersion } from "./solc/version";
import "./type-extensions";

interface VerificationArgs {
  address: string;
  // constructor args given as positional params
  constructorArgsParams: string[];
  // Filename of constructor arguments module
  constructorArgs?: string;
  // Fully qualified name of the contract
  contract?: string;
}

interface VerificationSubtaskArgs {
  address: string;
  constructorArguments: any[];
  // Fully qualified name of the contract
  contract?: string;
}

interface Build {
  compilationJob: CompilationJob;
  input: CompilerInput;
  output: CompilerOutput;
  solcBuild: any;
}

interface MinimumBuildArgs {
  sourceName: string;
}

interface GetContractInformationArgs {
  contractFQN: string;
  deployedBytecode: Bytecode;
  matchingCompilerVersions: string[];
}

interface VerifyMinimumBuildArgs {
  minimumBuild: Build;
  contractInformation: ContractInformation;
  etherscanAPIEndpoint: string;
  address: string;
  etherscanAPIKey: string;
  solcFullVersion: string;
  deployArgumentsEncoded: string;
}

extendConfig(etherscanConfigExtender);

const verify: ActionType<VerificationArgs> = async (
  {
    address,
    constructorArgsParams,
    constructorArgs: constructorArgsModule,
    contract,
  },
  { run }
) => {
  const constructorArguments: any[] = await run(
    TASK_VERIFY_GET_CONSTRUCTOR_ARGUMENTS,
    {
      constructorArgsModule,
      constructorArgsParams,
    }
  );

  return run(TASK_VERIFY_VERIFY, {
    address,
    constructorArguments,
    contract,
  });
};

const verifySubtask: ActionType<VerificationSubtaskArgs> = async (
  { address, constructorArguments, contract: contractFQN },
  { config, network, run }
) => {
  const { etherscan } = config;

  if (etherscan.apiKey === undefined || etherscan.apiKey.trim() === "") {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `Please provide an Etherscan API token via hardhat config.
E.g.: { [...], etherscan: { apiKey: 'an API key' }, [...] }
See https://etherscan.io/apis`
    );
  }

  // TODO: look for a better way to bypass this check during tests
  if (
    network.name === HARDHAT_NETWORK_NAME &&
    process.env.HARDHAT_ETHERSCAN_MOCK_NETWORK_TESTS !== "yes"
  ) {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `The selected network is ${network.name}. Please select a network supported by Etherscan.`
    );
  }

  const { isAddress } = await import("@ethersproject/address");
  if (!isAddress(address)) {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `${address} is an invalid address.`
    );
  }

  // This can only happen if the subtask is invoked from within Hardhat by a user script or another task.
  if (!Array.isArray(constructorArguments)) {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `The constructorArguments parameter should be an array.
If your constructor has no arguments pass an empty array. E.g:
await run("${TASK_VERIFY_VERIFY}", {
  <other args>,
  constructorArguments: []
};`
    );
  }

  const compilerVersions: string[] = await run(
    TASK_VERIFY_GET_COMPILER_VERSIONS
  );

  const etherscanAPIEndpoint: string = await run(
    TASK_VERIFY_GET_ETHERSCAN_ENDPOINT
  );

  const deployedBytecodeHex = await retrieveContractBytecode(
    address,
    network.provider,
    network.name
  );

  const deployedBytecode = new Bytecode(deployedBytecodeHex);
  const inferredSolcVersion = deployedBytecode.getInferredSolcVersion();

  const matchingCompilerVersions = compilerVersions.filter((version) => {
    return semver.satisfies(version, inferredSolcVersion);
  });
  if (matchingCompilerVersions.length === 0) {
    const detailedContext = [];
    if (isVersionRange(inferredSolcVersion)) {
      detailedContext.push(
        `The expected version range is ${inferredSolcVersion}.`
      );
    } else {
      detailedContext.push(`The expected version is ${inferredSolcVersion}.`);
    }
    // There is always at least one configured version.
    if (compilerVersions.length > 1) {
      detailedContext.push(
        `The selected compiler versions are: ${compilerVersions.join(", ")}`
      );
    } else {
      detailedContext.push(
        `The selected compiler version is: ${compilerVersions[0]}`
      );
    }
    const message = `The bytecode retrieved could not have been generated by any of the selected compilers.
${detailedContext.join("\n")}

Possible causes are:
  - Wrong compiler version selected in hardhat config.
  - The given address is wrong.
  - The selected network (${network.name}) is wrong.`;
    throw new NomicLabsHardhatPluginError(pluginName, message);
  }

  // Make sure that contract artifacts are up-to-date.
  await run(TASK_COMPILE);

  const contractInformation = await run(TASK_VERIFY_GET_CONTRACT_INFORMATION, {
    contractFQN,
    deployedBytecode,
    matchingCompilerVersions,
  });

  const deployArgumentsEncoded = await encodeArguments(
    contractInformation.contract.abi,
    contractInformation.sourceName,
    contractInformation.contractName,
    constructorArguments
  );

  const solcFullVersion = await getLongVersion(contractInformation.solcVersion);

  const minimumBuild: Build = await run(TASK_VERIFY_GET_MINIMUM_BUILD, {
    sourceName: contractInformation.sourceName,
  });

  const success: boolean = await run(TASK_VERIFY_VERIFY_MINIMUM_BUILD, {
    minimumBuild,
    contractInformation,
    etherscanAPIEndpoint,
    address,
    etherscanAPIKey: etherscan.apiKey,
    solcFullVersion,
    deployArgumentsEncoded,
  });
  if (success) {
    return;
  }

  // Fallback verification
  const verificationStatus = await attemptVerification(
    etherscanAPIEndpoint,
    contractInformation,
    address,
    etherscan.apiKey,
    contractInformation.compilerInput,
    solcFullVersion,
    deployArgumentsEncoded
  );

  if (verificationStatus.isVerificationSuccess()) {
    console.log(
      `Successfully verified full build of contract ${contractInformation.contractName} on Etherscan`
    );
    return;
  }

  // TODO: Add known edge cases here.
  // E.g:
  // - "Unable to locate ContractCode at <address>"
  // - Address of library used in constructor is wrong
  throw new NomicLabsHardhatPluginError(
    pluginName,
    `The contract verification failed.
Reason: ${verificationStatus.message}`
  );
};

subtask(TASK_VERIFY_GET_CONSTRUCTOR_ARGUMENTS)
  .addParam("constructorArgsParams", undefined, undefined, types.any)
  .addOptionalParam(
    "constructorArgsModule",
    undefined,
    undefined,
    types.inputFile
  )
  .setAction(
    async ({
      constructorArgsModule,
      constructorArgsParams,
    }: {
      constructorArgsModule?: string;
      constructorArgsParams: string[];
    }) => {
      if (typeof constructorArgsModule !== "string") {
        return constructorArgsParams;
      }

      const constructorArgsModulePath = path.resolve(
        process.cwd(),
        constructorArgsModule
      );

      try {
        const constructorArguments = (await import(constructorArgsModulePath))
          .default;

        if (!Array.isArray(constructorArguments)) {
          throw new NomicLabsHardhatPluginError(
            pluginName,
            `The module ${constructorArgsModulePath} doesn't export a list. The module should look like this:
module.exports = [ arg1, arg2, ... ];`
          );
        }

        return constructorArguments;
      } catch (error) {
        throw new NomicLabsHardhatPluginError(
          pluginName,
          `Importing the module for the constructor arguments list failed.
Reason: ${error.message}`,
          error
        );
      }
    }
  );

async function attemptVerification(
  etherscanAPIEndpoint: string,
  contractInformation: ContractInformation,
  contractAddress: string,
  etherscanAPIKey: string,
  compilerInput: CompilerInput,
  solcFullVersion: string,
  deployArgumentsEncoded: string
) {
  // Ensure the linking information is present in the compiler input;
  compilerInput.settings.libraries = contractInformation.libraryLinks;
  const request = toVerifyRequest({
    apiKey: etherscanAPIKey,
    contractAddress,
    sourceCode: JSON.stringify(compilerInput),
    sourceName: contractInformation.sourceName,
    contractName: contractInformation.contractName,
    compilerVersion: solcFullVersion,
    constructorArguments: deployArgumentsEncoded,
  });
  const response = await verifyContract(etherscanAPIEndpoint, request);

  console.log(
    `Successfully submitted source code for contract
${contractInformation.sourceName}:${contractInformation.contractName} at ${contractAddress}
for verification on Etherscan. Waiting for verification result...`
  );

  const pollRequest = toCheckStatusRequest({
    apiKey: etherscanAPIKey,
    guid: response.message,
  });

  // Compilation is bound to take some time so there's no sense in requesting status immediately.
  await delay(700);
  const verificationStatus = await getVerificationStatus(
    etherscanAPIEndpoint,
    pollRequest
  );

  if (
    verificationStatus.isVerificationFailure() ||
    verificationStatus.isVerificationSuccess()
  ) {
    return verificationStatus;
  }

  // Reaching this point shouldn't be possible unless the API is behaving in a new way.
  throw new NomicLabsHardhatPluginError(
    pluginName,
    `The API responded with an unexpected message.
Contract verification may have succeeded and should be checked manually.
Message: ${verificationStatus.message}`,
    undefined,
    true
  );
}

const getMinimumBuild: ActionType<MinimumBuildArgs> = async function (
  { sourceName },
  { run }
): Promise<Build> {
  const dependencyGraph: DependencyGraph = await run(
    TASK_COMPILE_SOLIDITY_GET_DEPENDENCY_GRAPH,
    { sourceNames: [sourceName] }
  );

  const resolvedFiles = dependencyGraph
    .getResolvedFiles()
    .filter((resolvedFile) => {
      return resolvedFile.sourceName === sourceName;
    });
  assertHardhatPluginInvariant(
    resolvedFiles.length === 1,
    `The plugin found an unexpected number of files for this contract.`
  );

  const compilationJob: CompilationJob = await run(
    TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOB_FOR_FILE,
    {
      dependencyGraph,
      file: resolvedFiles[0],
    }
  );

  const build: Build = await run(TASK_COMPILE_SOLIDITY_COMPILE_JOB, {
    compilationJob,
    compilationJobs: [compilationJob],
    compilationJobIndex: 0,
    emitsArtifacts: false,
    quiet: true,
  });

  return build;
};

async function inferContract(
  artifacts: Artifacts,
  network: Network,
  matchingCompilerVersions: string[],
  deployedBytecode: Bytecode
) {
  const contractMatches = await lookupMatchingBytecode(
    artifacts,
    matchingCompilerVersions,
    deployedBytecode
  );
  if (contractMatches.length === 0) {
    const message = `The address provided as argument contains a contract, but its bytecode doesn't match any of your local contracts.

Possible causes are:
  - Contract code changed after the deployment was executed. This includes code for seemingly unrelated contracts.
  - A solidity file was added, moved, deleted or renamed after the deployment was executed. This includes files for seemingly unrelated contracts.
  - Solidity compiler settings were modified after the deployment was executed (like the optimizer, target EVM, etc.).
  - The given address is wrong.
  - The selected network (${network.name}) is wrong.`;
    throw new NomicLabsHardhatPluginError(pluginName, message);
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

await run("${TASK_VERIFY_VERIFY}", {
  <other args>,
  contract: "contracts/Example.sol:ExampleContract"
};`;
    throw new NomicLabsHardhatPluginError(pluginName, message, undefined, true);
  }
  return contractMatches[0];
}

subtask(TASK_VERIFY_GET_COMPILER_VERSIONS).setAction(
  async (_, { config }): Promise<string[]> => {
    const compilerVersions = config.solidity.compilers.map((c) => c.version);
    if (config.solidity.overrides !== undefined) {
      for (const { version } of Object.values(config.solidity.overrides)) {
        compilerVersions.push(version);
      }
    }

    // Etherscan only supports solidity versions higher than or equal to v0.4.11.
    // See https://etherscan.io/solcversions
    const supportedSolcVersionRange = ">=0.4.11";
    if (
      compilerVersions.some((version) => {
        return !semver.satisfies(version, supportedSolcVersionRange);
      })
    ) {
      throw new NomicLabsHardhatPluginError(
        pluginName,
        `Etherscan only supports compiler versions 0.4.11 and higher.
See https://etherscan.io/solcversions for more information.`
      );
    }

    return compilerVersions;
  }
);

subtask(TASK_VERIFY_GET_ETHERSCAN_ENDPOINT).setAction(async (_, { network }) =>
  getEtherscanEndpoint(network.provider, network.name)
);

subtask(TASK_VERIFY_GET_CONTRACT_INFORMATION)
  .addParam("deployedBytecode", undefined, undefined, types.any)
  .addParam("matchingCompilerVersions", undefined, undefined, types.any)
  .addOptionalParam("contractFQN", undefined, undefined, types.string)
  .setAction(
    async (
      {
        contractFQN,
        deployedBytecode,
        matchingCompilerVersions,
      }: GetContractInformationArgs,
      { network, artifacts }
    ): Promise<ContractInformation> => {
      let contractInformation;
      if (contractFQN !== undefined) {
        // Check this particular contract
        if (!isFullyQualifiedName(contractFQN)) {
          throw new NomicLabsHardhatPluginError(
            pluginName,
            `A valid fully qualified name was expected. Fully qualified names look like this: "contracts/AContract.sol:TheContract"
Instead, this name was received: ${contractFQN}`
          );
        }

        if (!(await artifacts.artifactExists(contractFQN))) {
          throw new NomicLabsHardhatPluginError(
            pluginName,
            `The contract ${contractFQN} is not present in your project.`
          );
        }

        // Process BuildInfo here to check version and throw an error if unexpected version is found.
        const buildInfo = await artifacts.getBuildInfo(contractFQN);

        if (buildInfo === undefined) {
          throw new NomicLabsHardhatPluginError(
            pluginName,
            `The contract ${contractFQN} is present in your project, but we couldn't find its sources.
Please make sure that it has been compiled by Hardhat and that it is written in Solidity.`
          );
        }

        if (!matchingCompilerVersions.includes(buildInfo.solcVersion)) {
          const inferredSolcVersion = deployedBytecode.getInferredSolcVersion();
          let versionDetails;
          if (isVersionRange(inferredSolcVersion)) {
            versionDetails = `a solidity version in the range ${inferredSolcVersion}`;
          } else {
            versionDetails = `the solidity version ${inferredSolcVersion}`;
          }

          throw new NomicLabsHardhatPluginError(
            pluginName,
            `The contract ${contractFQN} is being compiled with ${buildInfo.solcVersion}.
However, the contract found in the address provided as argument has its bytecode marked with ${versionDetails}.

Possible causes are:
  - Solidity compiler version settings were modified after the deployment was executed.
  - The given address is wrong.
  - The selected network (${network.name}) is wrong.`
          );
        }

        const { sourceName, contractName } = parseFullyQualifiedName(
          contractFQN
        );
        contractInformation = await extractMatchingContractInformation(
          sourceName,
          contractName,
          buildInfo,
          deployedBytecode
        );

        if (contractInformation === null) {
          throw new NomicLabsHardhatPluginError(
            pluginName,
            `The address provided as argument contains a contract, but its bytecode doesn't match the contract ${contractFQN}.

Possible causes are:
  - Contract code changed after the deployment was executed. This includes code for seemingly unrelated contracts.
  - A solidity file was added, moved, deleted or renamed after the deployment was executed. This includes files for seemingly unrelated contracts.
  - Solidity compiler settings were modified after the deployment was executed (like the optimizer, target EVM, etc.).
  - The given address is wrong.
  - The selected network (${network.name}) is wrong.`
          );
        }
      } else {
        // Infer the contract
        contractInformation = await inferContract(
          artifacts,
          network,
          matchingCompilerVersions,
          deployedBytecode
        );
      }

      const libraryLinks = contractInformation.libraryLinks;
      const deployLibraryReferences =
        contractInformation.contract.evm.bytecode.linkReferences;
      if (
        Object.keys(libraryLinks).length <
        Object.keys(deployLibraryReferences).length
      ) {
        throw new NomicLabsHardhatPluginError(
          pluginName,
          `The contract ${contractInformation.sourceName}:${contractInformation.contractName} has one or more library references that cannot be detected from deployed bytecode.
This can occur if the library is only called in the contract constructor.`,
          undefined,
          true
        );
      }
      return contractInformation;
    }
  );

subtask(TASK_VERIFY_VERIFY_MINIMUM_BUILD)
  .addParam("minimumBuild", undefined, undefined, types.any)
  .addParam("contractInformation", undefined, undefined, types.any)
  .addParam("etherscanAPIEndpoint", undefined, undefined, types.string)
  .addParam("address", undefined, undefined, types.string)
  .addParam("etherscanAPIKey", undefined, undefined, types.string)
  .addParam("solcFullVersion", undefined, undefined, types.string)
  .addParam("deployArgumentsEncoded", undefined, undefined, types.string)
  .setAction(
    async ({
      minimumBuild,
      contractInformation,
      etherscanAPIEndpoint,
      address,
      etherscanAPIKey,
      solcFullVersion,
      deployArgumentsEncoded,
    }: VerifyMinimumBuildArgs): Promise<boolean> => {
      const minimumBuildContractBytecode =
        minimumBuild.output.contracts[contractInformation.sourceName][
          contractInformation.contractName
        ].evm.deployedBytecode.object;
      const matchedBytecode =
        contractInformation.compilerOutput.contracts[
          contractInformation.sourceName
        ][contractInformation.contractName].evm.deployedBytecode.object;

      if (minimumBuildContractBytecode === matchedBytecode) {
        const minimumBuildVerificationStatus = await attemptVerification(
          etherscanAPIEndpoint,
          contractInformation,
          address,
          etherscanAPIKey,
          minimumBuild.input,
          solcFullVersion,
          deployArgumentsEncoded
        );

        if (minimumBuildVerificationStatus.isVerificationSuccess()) {
          console.log(
            `Successfully verified contract ${contractInformation.contractName} on Etherscan`
          );
          return true;
        }

        console.log(
          `We tried verifying your contract ${contractInformation.contractName} without including any unrelated one, but it failed.
Trying again with the full solc input used to compile and deploy it.
This means that unrelated contracts may be displayed on Etherscan...`
        );
      } else {
        console.log(
          `Compiling your contract excluding unrelated contracts did not produce identical bytecode.
Trying again with the full solc input used to compile and deploy it.
This means that unrelated contracts may be displayed on Etherscan...`
        );
      }

      return false;
    }
  );

subtask(TASK_VERIFY_GET_MINIMUM_BUILD)
  .addParam("sourceName", undefined, undefined, types.string)
  .setAction(getMinimumBuild);

task(TASK_VERIFY, "Verifies contract on Etherscan")
  .addPositionalParam("address", "Address of the smart contract to verify")
  .addOptionalParam(
    "constructorArgs",
    "File path to a javascript module that exports the list of arguments.",
    undefined,
    types.inputFile
  )
  .addOptionalParam(
    "contract",
    "Fully qualified name of the contract to verify. " +
      "Skips automatic detection of the contract. " +
      "Use if the deployed bytecode matches more than one contract in your project."
  )
  .addOptionalVariadicPositionalParam(
    "constructorArgsParams",
    "Contract constructor arguments. Ignored if the --constructor-args option is used.",
    []
  )
  .setAction(verify);

subtask(TASK_VERIFY_VERIFY)
  .addParam("address", undefined, undefined, types.string)
  .addOptionalParam("constructorArguments", undefined, [], types.any)
  .addOptionalParam("contract", undefined, undefined, types.string)
  .setAction(verifySubtask);

function assertHardhatPluginInvariant(
  invariant: boolean,
  message: string
): asserts invariant {
  if (!invariant) {
    throw new NomicLabsHardhatPluginError(pluginName, message, undefined, true);
  }
}

function isVersionRange(version: string): boolean {
  return (
    version === METADATA_ABSENT_VERSION_RANGE ||
    version === METADATA_PRESENT_SOLC_NOT_FOUND_VERSION_RANGE
  );
}

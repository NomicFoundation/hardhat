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
  CompilationJob,
  CompilerInput,
  CompilerOutput,
  DependencyGraph,
} from "hardhat/types";
import path from "path";
import semver from "semver";

import { defaultEtherscanConfig } from "./config";
import {
  toCheckStatusRequest,
  toVerifyRequest,
} from "./etherscan/EtherscanVerifyContractRequest";
import {
  pluginName,
  TASK_VERIFY,
  TASK_VERIFY_GET_MINIMUM_BUILD,
} from "./pluginContext";
import type { ContractInformation } from "./solc/bytecode";
import "./type-extensions";

interface VerificationArgs {
  address: string;
  constructorArguments: string[];
  // Filename of constructor arguments module.
  constructorArgs?: string;
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

extendConfig(defaultEtherscanConfig);

const verify: ActionType<VerificationArgs> = async (
  {
    address,
    constructorArguments: constructorArgsList,
    constructorArgs: constructorArgsModule,
  },
  { config, network, run, artifacts }
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

  if (network.name === HARDHAT_NETWORK_NAME) {
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

  const supportedSolcVersionRange = ">=0.4.11";
  // Etherscan only supports solidity versions higher than or equal to v0.4.11.
  // See https://etherscan.io/solcversions
  // TODO: perhaps querying and scraping this list would be a better approach?
  // This list should be validated - it links to https://github.com/ethereum/solc-bin/blob/gh-pages/bin/list.txt
  // which has many old compilers included in the list too.
  const configuredVersions = config.solidity.compilers.map((c) => c.version);
  if (config.solidity.overrides !== undefined) {
    for (const { version } of Object.values(config.solidity.overrides)) {
      configuredVersions.push(version);
    }
  }
  if (
    configuredVersions.some((version) => {
      return !semver.satisfies(version, supportedSolcVersionRange);
    })
  ) {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `Etherscan only supports compiler versions 0.4.11 and higher.
See https://etherscan.io/solcversions for more information.`
    );
  }

  let constructorArguments;
  if (typeof constructorArgsModule === "string") {
    if (!path.isAbsolute(constructorArgsModule)) {
      // This ensures that the npm package namespace is ignored.
      constructorArgsModule = path.join(process.cwd(), constructorArgsModule);
    }
    try {
      constructorArguments = (await import(constructorArgsModule)).default;
      if (!Array.isArray(constructorArguments)) {
        throw new NomicLabsHardhatPluginError(
          pluginName,
          `The module doesn't export a list. The module should look like this:
module.exports = [ arg1, arg2, ... ];`
        );
      }
    } catch (error) {
      throw new NomicLabsHardhatPluginError(
        pluginName,
        `Importing the module for the constructor arguments list failed.
Reason: ${error.message}`,
        error
      );
    }
  } else {
    constructorArguments = constructorArgsList;
  }

  let etherscanAPIEndpoint: URL;
  const {
    getEtherscanEndpoint,
    retrieveContractBytecode,
    NetworkProberError,
  } = await import("./network/prober");
  try {
    etherscanAPIEndpoint = await getEtherscanEndpoint(network.provider);
  } catch (error) {
    if (error instanceof NetworkProberError) {
      throw new NomicLabsHardhatPluginError(
        pluginName,
        `${error.message} The selected network is ${network.name}.

Possible causes are:
  - The selected network (${network.name}) is wrong.
  - Faulty hardhat network config.`,
        error
      );
    }
    // Shouldn't be reachable.
    throw error;
  }

  const deployedContractBytecode = await retrieveContractBytecode(
    address,
    network.provider
  );
  if (deployedContractBytecode === null) {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `The address ${address} has no bytecode. Is the contract deployed to this network?
The selected network is ${network.name}.`
    );
  }

  const { getLongVersion, inferSolcVersion, InferralType } = await import(
    "./solc/version"
  );
  const bytecodeBuffer = Buffer.from(deployedContractBytecode, "hex");
  const inferredSolcVersion = await inferSolcVersion(bytecodeBuffer);

  const matchingVersions = configuredVersions.filter((version) => {
    return semver.satisfies(version, inferredSolcVersion.range);
  });
  if (matchingVersions.length === 0) {
    const detailedContext = [];
    if (inferredSolcVersion.inferralType === InferralType.EXACT) {
      detailedContext.push(
        `The expected version is ${inferredSolcVersion.range}.`
      );
    } else {
      detailedContext.push(
        `The expected version range is ${inferredSolcVersion.range}.`
      );
    }
    // There is always at least one configured version.
    if (configuredVersions.length > 1) {
      detailedContext.push(
        `The selected compiler versions are: ${configuredVersions.join(", ")}`
      );
    } else {
      detailedContext.push(
        `The selected compiler version is: ${configuredVersions[0]}`
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

  const { lookupMatchingBytecode } = await import("./solc/bytecode");
  const contractMatches = await lookupMatchingBytecode(
    artifacts,
    matchingVersions,
    deployedContractBytecode,
    inferredSolcVersion.inferralType
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
      .join(", ");
    const message = `More than one contract was found to match the deployed bytecode.
The plugin does not yet support this case. Contracts found:
${nameList}`;
    throw new NomicLabsHardhatPluginError(pluginName, message, undefined, true);
  }
  const [contractInformation] = contractMatches;

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

  const { encodeArguments } = await import("./ABIEncoder");
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
      etherscan.apiKey,
      minimumBuild.input,
      solcFullVersion,
      deployArgumentsEncoded
    );

    if (minimumBuildVerificationStatus.isVerificationSuccess()) {
      console.log(
        `Successfully verified contract ${contractInformation.contractName} on Etherscan`
      );
      return { success: true };
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
    return { success: true };
  }

  throw new NomicLabsHardhatPluginError(
    pluginName,
    `The contract verification failed.
Reason: ${verificationStatus.message}`
  );
};

async function attemptVerification(
  etherscanAPIEndpoint: URL,
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
  const { getVerificationStatus, verifyContract, delay } = await import(
    "./etherscan/EtherscanService"
  );
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

task(TASK_VERIFY, "Verifies contract on Etherscan")
  .addPositionalParam(
    "address",
    "Address of the smart contract that will be verified"
  )
  .addOptionalParam(
    "constructorArgs",
    "File path to a javascript module that exports the list of arguments."
  )
  .addOptionalVariadicPositionalParam(
    "constructorArguments",
    "Arguments used in the contract constructor. These are ignored if the --constructorArgs option is passed.",
    []
  )
  .setAction(verify);

subtask(TASK_VERIFY_GET_MINIMUM_BUILD)
  .addParam("sourceName", undefined, undefined, types.string)
  .setAction(getMinimumBuild);

function assertHardhatPluginInvariant(
  invariant: boolean,
  message: string
): asserts invariant {
  if (!invariant) {
    throw new NomicLabsHardhatPluginError(pluginName, message, undefined, true);
  }
}

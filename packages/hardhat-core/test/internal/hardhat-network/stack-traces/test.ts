import VM from "@ethereumjs/vm";
import { assert } from "chai";
import { BN, toBuffer } from "ethereumjs-util";
import fs from "fs";
import path from 'node:path';
import semver from "semver";

import { ReturnData } from "../../../../src/internal/hardhat-network/provider/return-data";
import { createModelsAndDecodeBytecodes } from "../../../../src/internal/hardhat-network/stack-traces/compiler-to-model";
import {
  ConsoleLogger,
  ConsoleLogs,
} from "../../../../src/internal/hardhat-network/stack-traces/consoleLogger";
import { ContractsIdentifier } from "../../../../src/internal/hardhat-network/stack-traces/contracts-identifier";
import {
  printMessageTrace,
  printStackTrace,
} from "../../../../src/internal/hardhat-network/stack-traces/debug";
import { linkHexStringBytecode } from "../../../../src/internal/hardhat-network/stack-traces/library-utils";
import {
  CallMessageTrace,
  CreateMessageTrace,
  MessageTrace,
} from "../../../../src/internal/hardhat-network/stack-traces/message-trace";
import {
  SolidityStackTraceEntry,
  StackTraceEntryType,
} from "../../../../src/internal/hardhat-network/stack-traces/solidity-stack-trace";
import {
  SolidityTracer,
  SUPPORTED_SOLIDITY_VERSION_RANGE,
} from "../../../../src/internal/hardhat-network/stack-traces/solidityTracer";
import { VmTraceDecoder } from "../../../../src/internal/hardhat-network/stack-traces/vm-trace-decoder";
import {
  CompilerInput,
  CompilerOutput,
  CompilerOutputBytecode,
} from "../../../../src/types";
import { setCWD } from "../helpers/cwd";

import {
  compileFiles,
  COMPILER_DOWNLOAD_TIMEOUT,
  CompilerOptions,
  downloadSolc,
} from "./compilation";
import {
  encodeCall,
  encodeConstructorParams,
  instantiateVm,
  traceTransaction,
} from "./execution";

interface StackFrameDescription {
  type: string;
  sourceReference?: {
    contract: string;
    file: string;
    function: string;
    line: number;
  };
  message?: string;
  value?: string | number;
  errorCode?: string;
}

interface TestDefinition {
  skip?: boolean;
  only?: boolean;
  print?: boolean;
  solc?: string;
  description?: string;
  transactions: TestTransaction[];
}

type TestTransaction = DeploymentTransaction | CallTransaction;

interface DeploymentTransaction {
  file: string;
  contract: string;
  value?: string | number; // Default: 0
  params?: Array<string | number>; // Default: no param
  libraries: {
    [file: string]: {
      [lib: string]: number; // The number of tx that deployed the lib
    };
  };
  stackTrace?: StackFrameDescription[]; // No stack trace === the tx MUST be successful
  imports?: string[]; // Imports needed for successful compilation
  consoleLogs?: ConsoleLogs[];
  gas?: number;
}

interface CallTransaction {
  value?: string | number; // Default: 0
  to: number; // The index of the tx that deployed the contract
  stackTrace?: StackFrameDescription[]; // No stack trace === the tx MUST be successful

  // There are two options to pass calldata, the first one (with higher priority) is with data
  data?: string; // 0x-prefixed Hex string

  // The second one is with function and parms
  function?: string; // Default: no data
  params?: Array<string | number>; // Default: no param
  consoleLogs?: ConsoleLogs[];
  gas?: number;
}

interface DeployedContract {
  file: string;
  name: string;
  address: Buffer;
}

const TEST_TIMEOUT_MILLIS = 120000;

function defineTest(
  dirPath: string,
  testDefinition: TestDefinition,
  sources: string[],
  compilerOptions: CompilerOptions,
  runs?: number
) {
  const desc: string =
    testDefinition.description !== undefined
      ? testDefinition.description
      : path.relative(__dirname, dirPath);

  const solcVersionDoesntMatch: boolean =
    testDefinition.solc !== undefined &&
    !semver.satisfies(compilerOptions.solidityVersion, testDefinition.solc);

  const func = async function (this: Mocha.Context) {
    this.timeout(TEST_TIMEOUT_MILLIS);

    await runTest(dirPath, testDefinition, sources, {
      ...compilerOptions,
      runs,
    });
  };

  if (
    (testDefinition.skip !== undefined && testDefinition.skip) ||
    solcVersionDoesntMatch
  ) {
    it.skip(desc, func);
  } else if (testDefinition.only !== undefined && testDefinition.only) {
    it.only(desc, func);
  } else {
    it(desc, func);
  }
}

function defineDirTests(dirPath: string, compilerOptions: CompilerOptions) {
  describe(path.basename(dirPath), function () {
    const files = fs.readdirSync(dirPath).map((f) => path.join(dirPath, f));

    const sources = files.filter((f) => f.endsWith(".sol"));
    const dirs = files.filter((f) => fs.statSync(f).isDirectory());
    const testPath = path.join(dirPath, "test.json");

    if (fs.existsSync(testPath)) {
      const testDefinition: TestDefinition = JSON.parse(
        fs.readFileSync(testPath, "utf8")
      );

      for (const tx of testDefinition.transactions) {
        if ("imports" in tx && tx.imports !== undefined) {
          sources.push(...tx.imports.map((p: string) => dirPath + p));
          break;
        }
      }

      describe("Without optimizations", function () {
        defineTest(dirPath, testDefinition, sources, compilerOptions);
      });

      if (process.env.HARDHAT_NETWORK_TESTS_WITH_OPTIMIZATIONS !== undefined) {
        const runsNumbers = [1, 200, 10000];

        for (const runs of runsNumbers) {
          describe(`With optimizations (${runs} run)`, function () {
            defineTest(dirPath, testDefinition, sources, compilerOptions, runs);
          });
        }
      }
    }

    for (const dir of dirs) {
      defineDirTests(dir, compilerOptions);
    }
  });
}

async function compileIfNecessary(
  testDir: string,
  sources: string[],
  compilerOptions: CompilerOptions
): Promise<[CompilerInput, CompilerOutput]> {
  const { solidityVersion, runs } = compilerOptions;
  const maxSourceCtime = sources
    .map((s) => fs.statSync(s).ctimeMs)
    .reduce((t1, t2) => Math.max(t1, t2), 0);

  const artifacts = path.join(testDir, "artifacts");

  if (!fs.existsSync(artifacts)) {
    fs.mkdirSync(artifacts);
  }

  const optimizerModifier =
    runs !== undefined ? `optimized-with-runs-${runs}` : "unoptimized";

  const inputPath = path.join(
    artifacts,
    `compiler-input-solc-${solidityVersion}-${optimizerModifier}.json`
  );

  const outputPath = path.join(
    artifacts,
    `compiler-output-solc-${solidityVersion}-${optimizerModifier}.json`
  );

  const isCached =
    fs.existsSync(inputPath) &&
    fs.existsSync(outputPath) &&
    fs.statSync(inputPath).ctimeMs > maxSourceCtime &&
    fs.statSync(outputPath).ctimeMs > maxSourceCtime;

  if (isCached) {
    const inputJson = fs.readFileSync(inputPath, "utf8");
    const outputJson = fs.readFileSync(outputPath, "utf8");

    return [JSON.parse(inputJson), JSON.parse(outputJson)];
  }

  const [compilerInput, compilerOutput] = await compileFiles(
    sources,
    compilerOptions
  );

  fs.writeFileSync(inputPath, JSON.stringify(compilerInput, undefined, 2));
  fs.writeFileSync(outputPath, JSON.stringify(compilerOutput, undefined, 2));

  return [compilerInput, compilerOutput];
}

function compareStackTraces(
  txIndex: number,
  trace: SolidityStackTraceEntry[],
  description: StackFrameDescription[],
  runs: number | undefined
) {
  assert.equal(
    trace.length,
    description.length,
    `Expected a trace of length ${description.length} but got one with length ${trace.length}`
  );

  for (let i = 0; i < trace.length; i++) {
    const actual = trace[i];
    const expected = description[i];

    assert.equal(
      StackTraceEntryType[actual.type],
      expected.type,
      `Stack trace of tx ${txIndex} entry ${i} type is incorrect`
    );

    const actualMessage = (actual as any).message as
      | ReturnData
      | string
      | undefined;

    // actual.message is a ReturnData in revert errors, but a string
    // in custom errors
    let decodedMessage = "";
    if (typeof actualMessage === "string") {
      decodedMessage = actualMessage;
    } else if (
      actualMessage instanceof ReturnData &&
      actualMessage.isErrorReturnData()
    ) {
      decodedMessage = actualMessage.decodeError();
    }

    if (expected.message !== undefined) {
      assert.equal(
        decodedMessage,
        expected.message,
        `Stack trace of tx ${txIndex} entry ${i} have different messages`
      );
    } else {
      assert.equal(
        decodedMessage,
        "",
        `Stack trace of tx ${txIndex} entry ${i} shouldn't have a message`
      );
    }

    if (expected.value !== undefined) {
      const actualValue = (actual as any).value;

      assert.isDefined(
        actualValue,
        `Stack trace of tx ${txIndex} entry ${i} should have value`
      );

      const expectedValue = new BN(expected.value);

      assert.isTrue(
        expectedValue.eq((actual as any).value),
        `Stack trace of tx ${txIndex} entry ${i} has value ${actualValue.toString(
          10
        )} and should have ${expectedValue.toString(10)}`
      );
    } else if ("value" in actual) {
      assert.isUndefined(
        actual.value,
        `Stack trace of tx ${txIndex} entry ${i} shouldn't have value`
      );
    }

    if (expected.errorCode !== undefined) {
      const actualErrorCode = (actual as any).errorCode;

      assert.isDefined(
        actualErrorCode,
        `Stack trace of tx ${txIndex} entry ${i} should have an errorCode`
      );

      const actualErrorCodeHex = actualErrorCode.toString("hex");

      assert.isTrue(
        expected.errorCode === actualErrorCodeHex,
        `Stack trace of tx ${txIndex} entry ${i} has errorCode ${actualErrorCodeHex} and should have ${expected.errorCode}`
      );
    } else if ("errorCode" in actual) {
      assert.isUndefined(
        actual.errorCode,
        `Stack trace of tx ${txIndex} entry ${i} shouldn't have errorCode`
      );
    }

    if (expected.sourceReference === undefined) {
      assert.isUndefined(
        actual.sourceReference,
        `Stack trace of tx ${txIndex} entry ${i} shouldn't have a sourceReference`
      );
    } else {
      assert.equal(
        actual.sourceReference!.contract,
        expected.sourceReference.contract,
        `Stack trace of tx ${txIndex} entry ${i} have different contract names`
      );

      assert.equal(
        actual.sourceReference!.sourceName,
        expected.sourceReference.file,
        `Stack trace of tx ${txIndex} entry ${i} have different file names`
      );

      assert.equal(
        actual.sourceReference!.function,
        expected.sourceReference.function,
        `Stack trace of tx ${txIndex} entry ${i} have different function names`
      );

      if (runs === undefined) {
        assert.equal(
          actual.sourceReference!.line,
          expected.sourceReference.line,
          `Stack trace of tx ${txIndex} entry ${i} have different line numbers`
        );
      }
    }
  }

  // We do it here so that the first few do get compared
  assert.lengthOf(trace, description.length);
}

function compareConsoleLogs(logs: ConsoleLogs[], expectedLogs?: ConsoleLogs[]) {
  if (expectedLogs === undefined) {
    return;
  }

  assert.lengthOf(logs, expectedLogs.length);

  for (let i = 0; i < logs.length; i++) {
    const actual = logs[i];
    const expected = expectedLogs[i];

    assert.lengthOf(actual, expected.length);

    for (let j = 0; j < actual.length; j++) {
      assert.equal(actual[j], expected[j]);
    }
  }
}

async function runTest(
  testDir: string,
  testDefinition: TestDefinition,
  sources: string[],
  compilerOptions: CompilerOptions
) {
  const [compilerInput, compilerOutput] = await compileIfNecessary(
    testDir,
    sources,
    compilerOptions
  );

  const bytecodes = createModelsAndDecodeBytecodes(
    compilerOptions.solidityVersion,
    compilerInput,
    compilerOutput
  );

  const contractsIdentifier = new ContractsIdentifier();

  for (const bytecode of bytecodes) {
    if (bytecode.contract.name.startsWith("Ignored")) {
      continue;
    }

    contractsIdentifier.addBytecode(bytecode);
  }

  const vmTraceDecoder = new VmTraceDecoder(contractsIdentifier);
  const tracer = new SolidityTracer();
  const logger = new ConsoleLogger();

  const vm = await instantiateVm();

  const txIndexToContract: Map<number, DeployedContract> = new Map();

  for (const [txIndex, tx] of testDefinition.transactions.entries()) {
    let trace: MessageTrace;

    if ("file" in tx) {
      trace = await runDeploymentTransactionTest(
        txIndex,
        tx,
        vm,
        compilerOutput,
        txIndexToContract
      );

      if (trace.deployedContract !== undefined) {
        txIndexToContract.set(txIndex, {
          file: tx.file,
          name: tx.contract,
          address: trace.deployedContract,
        });
      }
    } else {
      const contract = txIndexToContract.get(tx.to);

      assert.isDefined(
        contract,
        `No contract was deployed in tx ${tx.to} but transaction ${txIndex} is trying to call it`
      );

      trace = await runCallTransactionTest(
        txIndex,
        tx,
        vm,
        compilerOutput,
        contract!
      );
    }

    compareConsoleLogs(logger.getExecutionLogs(trace), tx.consoleLogs);

    const decodedTrace = vmTraceDecoder.tryToDecodeMessageTrace(trace);

    try {
      if (tx.stackTrace === undefined) {
        assert.isUndefined(
          trace.error,
          `Transaction ${txIndex} shouldn't have failed`
        );
      } else {
        assert.isDefined(
          trace.error,
          `Transaction ${txIndex} should have failed`
        );
      }
    } catch (error) {
      printMessageTrace(decodedTrace);

      throw error;
    }

    if (trace.error !== undefined) {
      const stackTrace = tracer.getStackTrace(decodedTrace);

      try {
        compareStackTraces(
          txIndex,
          stackTrace,
          tx.stackTrace!,
          compilerOptions.runs
        );
        if (testDefinition.print !== undefined && testDefinition.print) {
          console.log(`Transaction ${txIndex} stack trace`);
          printStackTrace(stackTrace);
        }
      } catch (err) {
        printMessageTrace(decodedTrace);
        printStackTrace(stackTrace);

        throw err;
      }
    }
  }
}

function linkBytecode(
  txIndex: number,
  bytecode: CompilerOutputBytecode,
  libs: { [file: string]: { [lib: string]: number } },
  txIndexToContract: Map<number, DeployedContract>
): Buffer {
  let code = bytecode.object;

  for (const [file, fileLibs] of Object.entries<any>(bytecode.linkReferences)) {
    assert.isDefined(
      libs,
      `Libraries missing for deploying transaction ${txIndex}`
    );

    assert.isDefined(
      libs[file],
      `Libraries missing for deploying transaction ${txIndex}`
    );

    for (const [libName, references] of Object.entries<any>(fileLibs)) {
      assert.isDefined(
        libs[file][libName],
        `Libraries missing for deploying transaction ${txIndex}`
      );

      const libTxId = libs[file][libName];
      const address = txIndexToContract.get(libTxId);

      assert.isDefined(
        address,
        `Trying to link a library deployed in ${libTxId} for tx ${txIndex} but id doesn't exist`
      );

      for (const ref of references) {
        code = linkHexStringBytecode(
          code,
          address!.address.toString("hex"),
          ref.start
        );
      }
    }
  }

  assert.notInclude(
    code,
    "_",
    `Libraries missing for deploying transaction ${txIndex}`
  );

  return Buffer.from(code, "hex");
}

async function runDeploymentTransactionTest(
  txIndex: number,
  tx: DeploymentTransaction,
  vm: VM,
  compilerOutput: CompilerOutput,
  txIndexToContract: Map<number, DeployedContract>
): Promise<CreateMessageTrace> {
  const file = compilerOutput.contracts[tx.file];

  assert.isDefined(
    file,
    `File ${tx.file} from transaction ${txIndex} doesn't exist`
  );

  const contract = file[tx.contract];

  assert.isDefined(
    contract,
    `Contract ${tx.contract} from transaction ${txIndex} doesn't exist`
  );

  const deploymentBytecode = linkBytecode(
    txIndex,
    contract.evm.bytecode,
    tx.libraries,
    txIndexToContract
  );

  const params = encodeConstructorParams(
    contract.abi,
    tx.params !== undefined ? tx.params : []
  );

  const data = Buffer.concat([deploymentBytecode, params]);

  const trace = await traceTransaction(vm, {
    value: tx.value,
    data,
    gasLimit: tx.gas,
  });

  return trace as CreateMessageTrace;
}

async function runCallTransactionTest(
  txIndex: number,
  tx: CallTransaction,
  vm: VM,
  compilerOutput: CompilerOutput,
  contract: DeployedContract
): Promise<CallMessageTrace> {
  const compilerContract =
    compilerOutput.contracts[contract.file][contract.name];

  let data: Buffer;

  if (tx.data !== undefined) {
    data = toBuffer(tx.data);
  } else if (tx.function !== undefined) {
    data = encodeCall(
      compilerContract.abi,
      tx.function,
      tx.params !== undefined ? tx.params : []
    );
  } else {
    data = Buffer.from([]);
  }

  const trace = await traceTransaction(vm, {
    to: contract.address,
    value: tx.value,
    data,
    gasLimit: tx.gas,
  });

  return trace as CallMessageTrace;
}

const solidityCompilers = [
  // 0.5
  {
    solidityVersion: "0.5.1",
    compilerPath: "soljson-v0.5.1+commit.c8a2cb62.js",
  },
  {
    solidityVersion: "0.5.17",
    compilerPath: "soljson-v0.5.17+commit.d19bba13.js",
  },

  // 0.6
  {
    solidityVersion: "0.6.0",
    compilerPath: "soljson-v0.6.0+commit.26b70077.js",
  },
  // {
  //   solidityVersion: "0.6.1",
  //   compilerPath: "soljson-v0.6.1+commit.e6f7d5a4.js",
  // },
  // {
  //   solidityVersion: "0.6.2",
  //   compilerPath: "soljson-v0.6.2+commit.bacdbe57.js",
  // },
  // This version is enabled because it contains of a huge change in how
  // sourcemaps work
  {
    solidityVersion: "0.6.3",
    compilerPath: "soljson-v0.6.3+commit.8dda9521.js",
  },
  // {
  //   solidityVersion: "0.6.4",
  //   compilerPath: "soljson-v0.6.4+commit.1dca32f3.js",
  // },
  // {
  //   solidityVersion: "0.6.5",
  //   compilerPath: "soljson-v0.6.5+commit.f956cc89.js",
  // },
  // {
  //   solidityVersion: "0.6.6",
  //   compilerPath: "soljson-v0.6.6+commit.6c089d02.js",
  // },
  // {
  //   solidityVersion: "0.6.7",
  //   compilerPath: "soljson-v0.6.7+commit.b8d736ae.js",
  // },
  // {
  //   solidityVersion: "0.6.8",
  //   compilerPath: "soljson-v0.6.8+commit.0bbfe453.js",
  // },
  // {
  //   solidityVersion: "0.6.9",
  //   compilerPath: "soljson-v0.6.9+commit.3e3065ac.js",
  // },
  // {
  //   solidityVersion: "0.6.10",
  //   compilerPath: "soljson-v0.6.10+commit.00c0fcaf.js",
  // },
  // {
  //   solidityVersion: "0.6.11",
  //   compilerPath: "soljson-v0.6.11+commit.5ef660b1.js",
  // },
  {
    solidityVersion: "0.6.12",
    compilerPath: "soljson-v0.6.12+commit.27d51765.js",
  },

  // 0.7
  // {
  //   solidityVersion: "0.7.0",
  //   compilerPath: "soljson-v0.7.0+commit.9e61f92b.js",
  // },
  // {
  //   solidityVersion: "0.7.1",
  //   compilerPath: "soljson-v0.7.1+commit.f4a555be.js",
  // },
  {
    solidityVersion: "0.7.4",
    compilerPath: "soljson-v0.7.4+commit.3f05b770.js",
  },

  // 0.8
  {
    solidityVersion: "0.8.1",
    compilerPath: "soljson-v0.8.1+commit.df193b15.js",
  },
  {
    solidityVersion: "0.8.4",
    compilerPath: "soljson-v0.8.4+commit.c7e474f2.js",
  },
  {
    solidityVersion: "0.8.5",
    compilerPath: "soljson-v0.8.5+commit.a4f2e591.js",
  },
  {
    solidityVersion: "0.8.6",
    compilerPath: "soljson-v0.8.6+commit.11564f7e.js",
  },
  {
    solidityVersion: "0.8.7",
    compilerPath: "soljson-v0.8.7+commit.e28d00a7.js",
  },
  {
    solidityVersion: "0.8.8",
    compilerPath: "soljson-v0.8.8+commit.dddeac2f.js",
  },
  {
    solidityVersion: "0.8.9",
    compilerPath: "soljson-v0.8.9+commit.e5eed63a.js",
  },
];

const solidity05Compilers = solidityCompilers.filter(({ solidityVersion }) =>
  semver.satisfies(solidityVersion, "^0.5.0")
);
const solidity06Compilers = solidityCompilers.filter(({ solidityVersion }) =>
  semver.satisfies(solidityVersion, "^0.6.0")
);
const solidity07Compilers = solidityCompilers.filter(({ solidityVersion }) =>
  semver.satisfies(solidityVersion, "^0.7.0")
);
const solidity08Compilers = solidityCompilers.filter(({ solidityVersion }) =>
  semver.satisfies(solidityVersion, "^0.8.0")
);

describe("Stack traces", function () {
  setCWD();

  // if a path to a solc file was specified, we only run these tests and use
  // that compiler
  const customSolcPath = process.env.HARDHAT_TESTS_SOLC_PATH;
  if (customSolcPath !== undefined) {
    const customSolcVersion = process.env.HARDHAT_TESTS_SOLC_VERSION;

    if (customSolcVersion === undefined) {
      console.error(
        "HARDHAT_TESTS_SOLC_VERSION has to be set when using HARDHAT_TESTS_SOLC_PATH"
      );
      process.exit(1);
    }

    if (!path.isAbsolute(customSolcPath)) {
      console.error("HARDHAT_TESTS_SOLC_PATH has to be an absolute path");
      process.exit(1);
    }

    describe.only(`Use compiler at ${customSolcPath} with version ${customSolcVersion}`, function () {
      const compilerOptions = {
        solidityVersion: customSolcVersion,
        compilerPath: customSolcPath,
      };

      const testsDir = semver.satisfies(customSolcVersion, "^0.5.0")
        ? "0_5"
        : semver.satisfies(customSolcVersion, "^0.6.0")
        ? "0_6"
        : semver.satisfies(customSolcVersion, "^0.7.0")
        ? "0_7"
        : semver.satisfies(customSolcVersion, "^0.8.0")
        ? "0_8"
        : null;

      if (testsDir === null) {
        console.error(`There are no tests for version ${customSolcVersion}`);
        process.exit(1);
      }

      defineDirTests(
        path.join(__dirname, "test-files", testsDir),
        compilerOptions
      );

      defineDirTests(
        path.join(__dirname, "test-files", "version-independent"),
        compilerOptions
      );
    });

    return;
  }

  before("Download solcjs binaries", async function () {
    const paths = new Set(solidityCompilers.map((c) => c.compilerPath));

    this.timeout(paths.size * COMPILER_DOWNLOAD_TIMEOUT);

    for (const p of paths) {
      await downloadSolc(p);
    }
  });

  defineTestForSolidityMajorVersion(solidity05Compilers, "0_5");
  defineTestForSolidityMajorVersion(solidity06Compilers, "0_6");
  defineTestForSolidityMajorVersion(solidity07Compilers, "0_7");
  defineTestForSolidityMajorVersion(solidity08Compilers, "0_8");
});

describe("Solidity support", function () {
  it("check that the latest tested version is within the supported version range", async function () {
    const latestSupportedVersion = solidityCompilers
      .map((sc) => sc.solidityVersion)
      .sort(semver.compare)[solidityCompilers.length - 1];

    assert.isTrue(
      semver.satisfies(
        latestSupportedVersion,
        SUPPORTED_SOLIDITY_VERSION_RANGE
      ),
      `Expected ${latestSupportedVersion} to be within the ${SUPPORTED_SOLIDITY_VERSION_RANGE} range`
    );

    const nextPatchVersion = semver.inc(latestSupportedVersion, "patch")!;
    const nextMinorVersion = semver.inc(latestSupportedVersion, "minor")!;
    const nextMajorVersion = semver.inc(latestSupportedVersion, "major")!;

    assert.isFalse(
      semver.satisfies(nextPatchVersion, SUPPORTED_SOLIDITY_VERSION_RANGE),
      `Expected ${nextPatchVersion} to not be within the ${SUPPORTED_SOLIDITY_VERSION_RANGE} range`
    );
    assert.isFalse(
      semver.satisfies(nextMinorVersion, SUPPORTED_SOLIDITY_VERSION_RANGE),
      `Expected ${nextMinorVersion} to not be within the ${SUPPORTED_SOLIDITY_VERSION_RANGE} range`
    );
    assert.isFalse(
      semver.satisfies(nextMajorVersion, SUPPORTED_SOLIDITY_VERSION_RANGE),
      `Expected ${nextMajorVersion} to not be within the ${SUPPORTED_SOLIDITY_VERSION_RANGE} range`
    );
  });
});

function defineTestForSolidityMajorVersion(
  solcVersionsCompilerOptions: CompilerOptions[],
  testsPath: string
) {
  for (const compilerOptions of solcVersionsCompilerOptions) {
    describe(`Use compiler ${compilerOptions.compilerPath}`, function () {
      defineDirTests(
        path.join(__dirname, "test-files", testsPath),
        compilerOptions
      );

      defineDirTests(
        path.join(__dirname, "test-files", "version-independent"),
        compilerOptions
      );
    });
  }
}

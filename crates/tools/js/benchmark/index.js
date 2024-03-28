// Trigger change

const child_process = require("child_process");
const path = require("path");
const fs = require("fs");
const readline = require("readline");
const zlib = require("zlib");

const { ArgumentParser } = require("argparse");
const { _ } = require("lodash");

const {
  createHardhatNetworkProvider,
} = require("hardhat/internal/hardhat-network/provider/provider");
const {
  AnvilServer,
} = require("@foundry-rs/hardhat-anvil/dist/src/anvil-server");
const { HttpProvider } = require("hardhat/internal/core/providers/http");

const SCENARIOS_DIR = "../../scenarios/";
const SCENARIO_SNAPSHOT_NAME = "snapshot.json";
const OZ_MAX_MIN_FAILURES = 1.05;
const ANVIL_HOST = "http://127.0.0.1:8545";

async function main() {
  const parser = new ArgumentParser({
    description: "Scenario benchmark runner",
  });
  parser.add_argument("command", {
    choices: ["benchmark", "verify", "report"],
    help: "Whether to run a benchmark, verify that there are no regressions or create a report for `github-action-benchmark`",
  });
  parser.add_argument("-g", "--grep", {
    type: "str",
    help: "Only execute the scenarios that contain the given string",
  });
  parser.add_argument("-o", "--benchmark-output", {
    type: "str",
    default: "./benchmark-output.json",
    help: "Where to save the benchmark output file",
  });
  parser.add_argument("--anvil", {
    action: "store_true",
    help: "Run benchmarks on Anvil node",
  });
  const args = parser.parse_args();

  // Make results not GC
  let results;
  if (args.command === "benchmark") {
    if (args.grep) {
      for (let scenarioFileName of getScenarioFileNames()) {
        if (scenarioFileName.includes(args.grep)) {
          results = await benchmarkScenario(scenarioFileName, args.anvil);
        }
      }
    } else {
      await benchmarkAllScenarios(args.benchmark_output, args.anvil);
    }
    await flushStdout();
  } else if (args.command === "verify") {
    const success = await verify(args.benchmark_output);
    process.exit(success ? 0 : 1);
  } else if (args.command === "report") {
    await report(args.benchmark_output);
    await flushStdout();
  }
}

async function report(benchmarkResultPath) {
  const benchmarkResult = require(benchmarkResultPath);

  let totalTime = 0;
  const report = [];
  for (let scenarioName in benchmarkResult) {
    const scenarioResult = benchmarkResult[scenarioName];
    report.push({
      name: scenarioName,
      unit: "ms",
      value: scenarioResult.timeMs,
    });
    totalTime += scenarioResult.timeMs;
  }
  report.unshift({
    name: "All Scenarios",
    unit: "ms",
    value: totalTime,
  });

  console.log(JSON.stringify(report));
}

async function verify(benchmarkResultPath) {
  let success = true;
  const benchmarkResult = require(benchmarkResultPath);
  const snapshotResult = require(path.join(
    getScenariosDir(),
    SCENARIO_SNAPSHOT_NAME
  ));

  for (let scenarioName in snapshotResult) {
    // TODO https://github.com/NomicFoundation/edr/issues/365
    if (scenarioName.includes("neptune-mutual")) {
      continue;
    }

    // TODO https://github.com/NomicFoundation/edr/issues/365
    if (scenarioName.includes("openzeppelin")) {
      const snapshotCount = snapshotResult[scenarioName].failures.length;
      const actualCount = benchmarkResult[scenarioName].failures.length;
      const ratio =
        Math.max(snapshotCount, actualCount) /
        Math.min(snapshotCount, actualCount);

      if (ratio > OZ_MAX_MIN_FAILURES) {
        console.error(
          `Snapshot failure for ${scenarioName} with max/min failure ratio`,
          ratio
        );
        success = false;
      }

      continue;
    }

    let snapshotFailures = new Set(snapshotResult[scenarioName].failures);
    let benchFailures = new Set(benchmarkResult[scenarioName].failures);

    if (!_.isEqual(snapshotFailures, benchFailures)) {
      success = false;
      const shouldFail = setDifference(snapshotFailures, benchFailures);
      const shouldNotFail = setDifference(benchFailures, snapshotFailures);

      // We're logging to stderr so that it doesn't pollute stdout where we write the result
      console.error(`Snapshot failure for ${scenarioName}`);

      if (shouldFail.size > 0) {
        console.error(
          `Scenario ${scenarioName} should fail at indexes ${Array.from(
            shouldFail
          ).sort()}`
        );
      }

      if (shouldNotFail.size > 0) {
        console.error(
          `Scenario ${scenarioName} should not fail at indexes ${Array.from(
            shouldNotFail
          ).sort()}`
        );
      }
    }
  }

  if (success) {
    console.error("Benchmark result matches snapshot");
  }

  return success;
}

// From https://stackoverflow.com/a/66512466
function setDifference(a, b) {
  return new Set(Array.from(a).filter((item) => !b.has(item)));
}

async function benchmarkAllScenarios(outPath, useAnvil) {
  const result = {};
  let totalTime = 0;
  let totalFailures = 0;
  for (let scenarioFileName of getScenarioFileNames()) {
    const args = [
      "--noconcurrent_sweeping",
      "--noconcurrent_recompilation",
      "--max-old-space-size=28000",
      "index.js",
      "benchmark",
      "-g",
      scenarioFileName,
    ];
    if (useAnvil) {
      args.push("--anvil");
    }

    try {
      const scenarioResults = [];
      const iterations = numIterations(scenarioFileName);
      for (let i = 0; i < iterations; i++) {
        // Run in subprocess with grep to simulate Hardhat test runner behaviour
        // where there is one provider per process
        const processResult = child_process.spawnSync(process.argv[0], args, {
          shell: true,
          timeout: 60 * 60 * 1000,
          // Pipe stdout, proxy the rest
          stdio: [process.stdin, "pipe", process.stderr],
          encoding: "utf-8",
        });
        const scenarioResult = JSON.parse(processResult.stdout);
        scenarioResults.push(scenarioResult);
      }
      const scenarioResult = medianOfResults(scenarioResults);
      totalTime += scenarioResult.result.timeMs;
      totalFailures += scenarioResult.result.failures.length;
      result[scenarioResult.name] = scenarioResult.result;
    } catch (e) {
      console.error(e);
      console.error(processResult.stdout.toString());
      throw e;
    }
  }

  fs.writeFileSync(outPath, JSON.stringify(result) + "\n");

  // Log info to stderr so that it doesn't pollute stdout where we write the result
  console.error(
    `Total time ${
      Math.round(100 * (totalTime / 1000)) / 100
    } seconds with ${totalFailures} failures.`
  );

  console.error(`Benchmark results written to ${outPath}`);
}

function numIterations(scenarioName) {
  // Run fast scenarios repeatedly to get more reliable results
  if (scenarioName.includes("safe-contracts")) {
    return 15;
  } else if (
    scenarioName.includes("seaport") ||
    scenarioName.includes("openzeppelin") ||
    scenarioName.includes("rocketpool") ||
    scenarioName.includes("uniswap")
  ) {
    return 5;
  } else if (scenarioName.includes("neptune-mutual")) {
    return 3;
  } else {
    return 1;
  }
}

function medianOfResults(results) {
  if (results.length === 0) {
    throw new Error("No results to calculate median");
  }
  const sorted = results.sort((a, b) => a.result.timeMs - b.result.timeMs);
  const middle = Math.floor(sorted.length / 2);
  return sorted[middle];
}

async function benchmarkScenario(scenarioFileName, useAnvil) {
  let { config, requests } = await loadScenario(scenarioFileName);
  const name = path.basename(scenarioFileName).split(".")[0];
  console.error(`Running ${name} scenario`);

  const start = performance.now();

  let provider;
  let anvilServer;
  if (useAnvil) {
    try {
      // Wrapper doesn't support `--prune-history` argument, hence `launch: false`
      anvilServer = await AnvilServer.launch({ launch: false });
      provider = new HttpProvider(ANVIL_HOST, "anvil");
    } catch (e) {
      if (anvilServer) {
        anvilServer.kill();
      }
      throw e;
    }
  } else {
    provider = await createHardhatNetworkProvider(config.providerConfig, {
      enabled: config.loggerEnabled,
    });
  }

  const failures = [];
  const rpcCallResults = [];
  const rpcCallErrors = [];

  for (let i = 0; i < requests.length; i += 1) {
    try {
      const result = await provider.request(requests[i]);
      rpcCallResults.push(result);
    } catch (e) {
      rpcCallErrors.push(e);
      failures.push(i);
    }
  }

  const timeMs = performance.now() - start;

  if (anvilServer) {
    anvilServer.kill();
  }

  console.error(
    `${name} finished in ${
      Math.round(100 * (timeMs / 1000)) / 100
    } seconds with ${failures.length} failures.`
  );

  const result = {
    name,
    result: {
      timeMs,
      failures,
    },
  };
  console.log(JSON.stringify(result));

  // Return this to avoid gc
  return { rpcCallResults, rpcCallErrors };
}

async function loadScenario(scenarioFileName) {
  const result = {
    requests: [],
  };
  let i = 0;
  const filePath = path.join(getScenariosDir(), scenarioFileName);
  for await (const line of readFile(filePath)) {
    const parsed = JSON.parse(line);
    if (i === 0) {
      result.config = preprocessConfig(parsed);
    } else {
      result.requests.push(parsed);
    }
    i += 1;
  }
  return result;
}

function preprocessConfig(config) {
  // From https://stackoverflow.com/a/59771233
  const camelize = (obj) =>
    _.transform(obj, (acc, value, key, target) => {
      const camelKey = _.isArray(target) ? key : _.camelCase(key);

      acc[camelKey] = _.isObject(value) ? camelize(value) : value;
    });
  config = camelize(config);

  // EDR serializes None as null to json, but Hardhat expects it to be undefined
  const removeNull = (obj) =>
    _.transform(obj, (acc, value, key) => {
      if (_.isObject(value)) {
        acc[key] = removeNull(value);
      } else if (!_.isNull(value)) {
        acc[key] = value;
      }
    });
  config = removeNull(config);

  config.providerConfig.initialDate = new Date(
    config.providerConfig.initialDate.secsSinceEpoch * 1000
  );

  config.providerConfig.hardfork = normalizeHardfork(
    config.providerConfig.hardfork
  );

  // "accounts" in EDR are "genesisAccounts" in Hardhat
  if (Object.keys(config.providerConfig.genesisAccounts).length !== 0) {
    throw new Error("Genesis accounts are not supported");
  }
  config.providerConfig.genesisAccounts = config.providerConfig.accounts.map(
    ({ balance, secretKey }) => {
      return { balance, privateKey: secretKey };
    }
  );
  delete config.providerConfig.accounts;

  config.providerConfig.automine = config.providerConfig.mining.autoMine;
  config.providerConfig.mempoolOrder =
    config.providerConfig.mining.memPool.order.toLowerCase();
  config.providerConfig.intervalMining =
    config.providerConfig.mining.interval ?? 0;
  delete config.providerConfig.mining;

  config.providerConfig.throwOnCallFailures =
    config.providerConfig.bailOnCallFailure;
  delete config.providerConfig.bailOnCallFailure;
  config.providerConfig.throwOnTransactionFailures =
    config.providerConfig.bailOnTransactionFailure;
  delete config.providerConfig.bailOnTransactionFailure;

  let chains = new Map();
  for (let key of Object.keys(config.providerConfig.chains)) {
    const hardforkHistory = new Map();
    const hardforks = config.providerConfig.chains[key].hardforks;
    for (let [blockNumber, hardfork] of hardforks) {
      hardforkHistory.set(normalizeHardfork(hardfork), blockNumber);
    }
    chains.set(Number(key), { hardforkHistory });
  }
  config.providerConfig.chains = chains;

  if (!_.isUndefined(config.providerConfig.fork)) {
    config.providerConfig.forkConfig = config.providerConfig.fork;
    delete config.providerConfig.fork;
  }

  config.providerConfig.minGasPrice = BigInt(config.providerConfig.minGasPrice);

  return config;
}

function normalizeHardfork(hardfork) {
  hardfork = _.camelCase(hardfork.toLowerCase());
  if (hardfork === "frontier") {
    hardfork = "chainstart";
  } else if (hardfork === "daoFork") {
    hardfork = "dao";
  } else if (hardfork == "tangerine") {
    hardfork = "tangerineWhistle";
  }
  return hardfork;
}

// From https://stackoverflow.com/a/65015455/2650622
function readFile(path) {
  let stream = fs.createReadStream(path);

  if (/\.gz$/i.test(path)) {
    stream = stream.pipe(zlib.createGunzip());
  }

  return readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });
}

function getScenariosDir() {
  return path.join(__dirname, SCENARIOS_DIR);
}

function getScenarioFileNames() {
  const scenariosDir = path.join(__dirname, SCENARIOS_DIR);
  const scenarioFiles = fs.readdirSync(scenariosDir);
  scenarioFiles.sort();
  return scenarioFiles.filter((fileName) => fileName.endsWith(".jsonl.gz"));
}

async function flushStdout() {
  return new Promise((resolve) => {
    process.stdout.write("", resolve);
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .then(() => {
    process.exit(0);
  });

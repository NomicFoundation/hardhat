import path from "path";
import * as fs from "fs";
import * as readline from "readline";
import * as zlib from "zlib";

import _ from "lodash";

import { createHardhatNetworkProvider } from "hardhat/internal/hardhat-network/provider/provider";

const SCENARIOS_DIR = "../../scenarios/";

async function main() {
  const result = {};
  const scenariosDir = path.join(__dirname, SCENARIOS_DIR);

  // List files in scenarios directory
  const scenarioFiles = await fs.promises.readdir(scenariosDir);
  scenarioFiles.sort();
  let totalTime = 0;
  let totalFailures = 0;
  for (let scenarioFile of scenarioFiles) {
    // Get the filename from the path
    const scenarioResult = await runScenario(
      path.join(scenariosDir, scenarioFile)
    );
    totalTime += scenarioResult.result.timeMs;
    totalFailures += scenarioResult.result.failures.length;
    result[scenarioResult.name] = scenarioResult.result;
  }

  console.log(JSON.stringify(result));

  // Log info to stderr so that it doesn't pollute stdout where we write the result
  console.error(
    `Total time ${
      Math.round(100 * (totalTime / 1000)) / 100
    } seconds with ${totalFailures} failures.`
  );

  process.exit(0);
}

async function runScenario(scenarioPath: string) {
  const { config, requests } = await loadScenario(scenarioPath);
  const name = path.basename(scenarioPath).split(".")[0];
  console.error(`Running ${name} scenario`);

  const start = performance.now();

  const provider = await createHardhatNetworkProvider(config.providerConfig, {
    enabled: config.loggerEnabled,
  });

  const failures = [];

  for (let i = 0; i < requests.length; i += 1) {
    try {
      await provider.request(requests[i]);
    } catch (e) {
      failures.push(i);
    }
  }

  const timeMs = performance.now() - start;

  console.error(
    `${name} finished in ${
      Math.round(100 * (timeMs / 1000)) / 100
    } seconds with ${failures.length} failures.`
  );

  return {
    name,
    result: {
      timeMs,
      failures,
    },
  };
}

async function loadScenario(path: string) {
  const result = {
    requests: [],
  };
  let i = 0;
  for await (const line of readFile(path)) {
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

function preprocessConfig(config: Record<string, any>) {
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

function normalizeHardfork(hardfork: string) {
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
function readFile(path: string) {
  let stream: NodeJS.ReadableStream = fs.createReadStream(path);

  if (/\.gz$/i.test(path)) {
    stream = stream.pipe(zlib.createGunzip());
  }

  return readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

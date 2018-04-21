const fs = require("fs-extra");
const path = require("path");

async function buildArtifacts(config, compilationOutput) {
  const abiPath = path.join(config.paths.artifacts, "abi");
  const bytecodePath = path.join(config.paths.artifacts, "bytecode");

  await fs.ensureDir(abiPath);
  await fs.ensureDir(bytecodePath);

  for (const [globalFileName, fileContracts] of Object.entries(
    compilationOutput.contracts
  )) {
    for (const [contractName, contract] of Object.entries(fileContracts)) {
      // If we want to support multiple contracts with the same name we need to
      // somehow respect their FS hierarchy, but solidity doesn't have a 1-to-1
      // relationship between contracts and files. Then, using the
      // globalFileName as name here would be wrong. But we can use it's dirname
      // at least.
      const outputPath = path.join(path.dirname(globalFileName), contractName);

      await fs.outputJSON(
        path.join(abiPath, outputPath + ".json"),
        contract.abi,
        { spaces: 2 }
      );

      if (contract.evm && contract.evm.bytecode) {
        await fs.outputJSON(
          path.join(bytecodePath, outputPath + ".json"),
          contract.evm.bytecode,
          { spaces: 2 }
        );
      }
    }
  }
}

async function getContractAbi(name) {
  const { config } = require("./env");

  const abiPath = path.join(
    config.paths.root,
    "artifacts",
    "abi",
    "contracts",
    `${name}.json`
  );

  return fs.readJson(abiPath);
}

async function getContractBytecode(name) {
  const { config } = require("./env");

  const bytecodePath = path.join(
    config.paths.root,
    "artifacts",
    "bytecode",
    "contracts",
    `${name}.json`
  );

  return fs.readJson(bytecodePath);
}

async function getContract(name) {
  const { web3 } = require("./env");

  const abi = await getContractAbi(name);

  return new web3.eth.Contract(abi);
}

module.exports = {
  buildArtifacts,
  getContractAbi,
  getContractBytecode,
  getContract
};

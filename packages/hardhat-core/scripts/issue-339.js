const log = require('why-is-node-running')
const edr = require("@nomicfoundation/edr")

const config = {
  allowBlocksWithSameTimestamp: true,
  allowUnlimitedContractSize: true,
  bailOnCallFailure: true,
  bailOnTransactionFailure: true,
  blockGasLimit: 1_000_000n,
  chainId: 31337n,
  chains: [],
  coinbase: Buffer.from("0000000000000000000000000000000000000000", "hex"),
  genesisAccounts: [],
  hardfork: edr.SpecId.Latest,
  minGasPrice: 0n,
  mining: {
    autoMine: true,
    memPool: {
      order: edr.MineOrdering.Priority,
    }
  },
  networkId: 31337n,
}

const loggerConfig = {
  enable: true,
  decodeConsoleLogInputsCallback: (_inputs) => { return []; },
  getContractAndFunctionNameCallback: (_code) => { return { contractName: "" }; },
  printLineCallback: (_message, _replace) => {},
}

async function main() {
  const context = new edr.EdrContext()
  const provider = edr.Provider.withConfig(context, config, loggerConfig, () => {})

  console.log("main finished")

  setTimeout(function () {
    log() // logs out active handles that are keeping node running
  }, 1000)
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

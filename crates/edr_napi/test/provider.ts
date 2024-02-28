import chai, { assert } from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  ContractAndFunctionName,
  EdrContext,
  MineOrdering,
  Provider,
  SpecId,
  SubscriptionEvent,
} from "..";

chai.use(chaiAsPromised);

function getEnv(key: string): string | undefined {
  const variable = process.env[key];
  if (variable === undefined || variable === "") {
    return undefined;
  }

  const trimmed = variable.trim();

  return trimmed.length === 0 ? undefined : trimmed;
}

const ALCHEMY_URL = getEnv("ALCHEMY_URL");

describe("Provider", () => {
  const context = new EdrContext();
  const providerConfig = {
    allowBlocksWithSameTimestamp: false,
    allowUnlimitedContractSize: true,
    bailOnCallFailure: false,
    bailOnTransactionFailure: false,
    blockGasLimit: 300_000_000n,
    chainId: 123n,
    chains: [],
    coinbase: Buffer.from("0000000000000000000000000000000000000000", "hex"),
    genesisAccounts: [],
    hardfork: SpecId.Latest,
    initialBlobGas: {
      gasUsed: 0n,
      excessGas: 0n,
    },
    initialParentBeaconBlockRoot: Buffer.from(
      "0000000000000000000000000000000000000000000000000000000000000000",
      "hex"
    ),
    minGasPrice: 0n,
    mining: {
      autoMine: true,
      memPool: {
        order: MineOrdering.Priority,
      },
    },
    networkId: 123n,
  };

  const loggerConfig = {
    enable: false,
    decodeConsoleLogInputsCallback: (inputs: Buffer[]): string[] => {
      return [];
    },
    getContractAndFunctionNameCallback: (
      _code: Buffer,
      _calldata?: Buffer
    ): ContractAndFunctionName => {
      return {
        contractName: "",
      };
    },
    printLineCallback: (message: string, replace: boolean) => {},
  };

  it("initialize local", async function () {
    const provider = Provider.withConfig(
      context,
      providerConfig,
      loggerConfig,
      (_event: SubscriptionEvent) => {}
    );

    await assert.isFulfilled(provider);
  });

  it("initialize remote", async function () {
    if (ALCHEMY_URL === undefined) {
      this.skip();
    }

    const provider = Provider.withConfig(
      context,
      {
        fork: {
          jsonRpcUrl: ALCHEMY_URL,
        },
        ...providerConfig,
      },
      loggerConfig,
      (_event: SubscriptionEvent) => {}
    );

    await assert.isFulfilled(provider);
  });
});

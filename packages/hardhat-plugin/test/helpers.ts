import { buildModule, IDeploymentBuilder } from "@ignored/ignition-core";
import { ModuleDict } from "@ignored/ignition-core/src/types/module";

export const resultAssertions = {
  contract: (predicate?: ContractResultPredicate): ExpectedFutureResult => {
    return {
      kind: "contract",
      predicate: predicate ?? (async () => {}),
    };
  },
  transaction: (): ExpectedFutureResult => {
    return {
      kind: "transaction",
    };
  },
};

type ContractResultPredicate = (contract: any) => Promise<void>;
type ExpectedFutureResult =
  | {
      kind: "contract";
      predicate: ContractResultPredicate;
    }
  | {
      kind: "transaction";
    };

export async function mineBlocks(
  hre: any,
  expectedBlocks: number[],
  finished: Promise<any>
) {
  for (const expectedPendingTxs of expectedBlocks) {
    await waitForPendingTxs(hre, expectedPendingTxs, finished);
    await hre.network.provider.send("evm_mine");
  }
}

const sleep = (timeout: number) =>
  new Promise((res) => setTimeout(res, timeout));

/**
 * Wait until there are at least `expectedCount` transactions in the mempool
 */
async function waitForPendingTxs(
  hre: any,
  expectedCount: number,
  finished: Promise<any>
) {
  let stopWaiting = false;
  finished.finally(() => {
    stopWaiting = true;
  });

  while (true) {
    if (stopWaiting) {
      return;
    }
    const pendingBlock = await hre.network.provider.send(
      "eth_getBlockByNumber",
      ["pending", false]
    );

    if (pendingBlock.transactions.length >= expectedCount) {
      return;
    }

    await sleep(50);
  }
}

export async function deployModule(
  hre: any,
  moduleDefinition: (m: IDeploymentBuilder) => ModuleDict,
  options?: { parameters: {} }
): Promise<any> {
  await hre.run("compile", { quiet: true });

  const userModule = buildModule("MyModule", moduleDefinition);

  const deployPromise = hre.ignition.deploy(userModule, {
    ...options,
    ui: false,
  });

  await mineBlocks(hre, [1, 1, 1], deployPromise);

  const result = await deployPromise;

  return result;
}

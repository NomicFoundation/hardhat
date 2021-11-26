import { assert } from "chai";
import { DeploymentState, UserModule } from "ignition";

/**
 * Wait until there are at least `expectedCount` transactions in the mempool
 */
export async function waitForPendingTxs(
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

    await sleep(100);
  }
}

const sleep = (timeout: number) =>
  new Promise((res) => setTimeout(res, timeout));

export const resultAssertions = {
  contract: (predicate?: ContractResultPredicate): ExpectedBindingResult => {
    return {
      kind: "contract",
      predicate: predicate ?? (async () => {}),
    };
  },
  transaction: (): ExpectedBindingResult => {
    return {
      kind: "transaction",
    };
  },
};

type ContractResultPredicate = (contract: any) => Promise<void>;
type ExpectedBindingResult =
  | {
      kind: "contract";
      predicate: ContractResultPredicate;
    }
  | {
      kind: "transaction";
    };
type ExpectedModuleResult = Record<string, ExpectedBindingResult>;
type ExpectedDeploymentState = Record<string, ExpectedModuleResult>;

export async function assertDeploymentState(
  hre: any,
  result: DeploymentState,
  expectedResult: ExpectedDeploymentState
) {
  const modulesStates = result.getModules();
  const expectedModules = Object.entries(expectedResult);

  assert.equal(modulesStates.length, expectedModules.length);

  for (const moduleState of modulesStates) {
    const expectedModule = expectedResult[moduleState.id];

    assert.isDefined(expectedModule);

    assert.equal(moduleState.count(), Object.entries(expectedModule).length);

    for (const [bindingId, expectedBindingResult] of Object.entries(
      expectedModule
    )) {
      const bindingResult: any = moduleState.getBindingResult(bindingId);

      if (expectedBindingResult.kind === "contract") {
        assert.isDefined(bindingResult.address);
        await assertHasCode(hre, bindingResult.address);

        const contract = await hre.ethers.getContractAt(
          bindingResult.abi,
          bindingResult.address
        );

        await expectedBindingResult.predicate(contract);
      } else if (expectedBindingResult.kind === "transaction") {
        assert.isDefined(bindingResult.hash);
        await assertTxMined(hre, bindingResult.hash);
      } else {
        const _exhaustiveCheck: never = expectedBindingResult;
      }
    }
  }
}

async function assertHasCode(hre: any, address: string) {
  const code = await hre.network.provider.send("eth_getCode", [address]);
  assert.notEqual(code, "0x");
}

async function assertTxMined(hre: any, hash: string) {
  const receipt = await hre.network.provider.send("eth_getTransactionReceipt", [
    hash,
  ]);
  assert.isNotNull(receipt);
}

export async function deployModules(
  hre: any,
  userModules: Array<UserModule<any>>,
  expectedBlocks: number[]
): Promise<DeploymentState> {
  await hre.run("compile", { quiet: true });

  const deploymentStatePromise: Promise<DeploymentState> = hre.run(
    "deploy:deploy-modules",
    {
      userModules,
    }
  );

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  mineBlocks(hre, expectedBlocks, deploymentStatePromise);

  return deploymentStatePromise;
}

async function mineBlocks(
  hre: any,
  expectedBlocks: number[],
  finished: Promise<any>
) {
  for (const expectedPendingTxs of expectedBlocks) {
    await waitForPendingTxs(hre, expectedPendingTxs, finished);
    await hre.network.provider.send("evm_mine");
  }
}

export async function assertRejects(fn: () => Promise<any>) {
  let rejected: boolean;
  try {
    await fn();
    rejected = false;
  } catch (e) {
    rejected = true;
  }

  assert.isTrue(rejected, "Expected function to reject");
}

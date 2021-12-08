import { assert } from "chai";
import {
  UserModule,
  SerializedDeploymentResult,
  DeploymentResult,
} from "ignition";

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
  result: SerializedDeploymentResult,
  expectedResult: ExpectedDeploymentState
) {
  const modulesResults = Object.entries(result);
  const expectedModules = Object.entries(expectedResult);

  assert.equal(modulesResults.length, expectedModules.length);

  for (const [moduleId, moduleResult] of modulesResults) {
    const expectedModule = expectedResult[moduleId];

    assert.isDefined(expectedModule);

    assert.equal(
      Object.entries(moduleResult).length,
      Object.entries(expectedModule).length
    );

    for (const [bindingId, expectedBindingResult] of Object.entries(
      expectedModule
    )) {
      const bindingResult = moduleResult[bindingId];

      if (expectedBindingResult.kind === "contract") {
        if (bindingResult._kind !== "contract") {
          assert.fail(
            `Expected binding result to be a contract, but got ${bindingResult._kind}`
          );
        }
        await assertHasCode(hre, bindingResult.value.address);

        const contract = await hre.ethers.getContractAt(
          bindingResult.value.abi,
          bindingResult.value.address
        );

        await expectedBindingResult.predicate(contract);
      } else if (expectedBindingResult.kind === "transaction") {
        if (bindingResult._kind !== "tx") {
          assert.fail(
            `Expected binding result to be a transaction, but got ${bindingResult._kind}`
          );
        }
        assert.isDefined(bindingResult.value.hash);
        await assertTxMined(hre, bindingResult.value.hash);
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
): Promise<SerializedDeploymentResult> {
  await hre.run("compile", { quiet: true });

  const deploymentResultPromise: Promise<DeploymentResult> = hre.run(
    "deploy:deploy-modules",
    {
      userModules,
    }
  );

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  mineBlocks(hre, expectedBlocks, deploymentResultPromise);

  const deploymentResult = await deploymentResultPromise;

  if (deploymentResult._kind !== "success") {
    assert.fail("Expected deployment result to be successful");
  }

  return deploymentResult.result;
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

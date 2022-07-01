import {
  UserModule,
  SerializedBindingResult,
  SerializedDeploymentResult,
  DeploymentResult,
  Contract,
} from "@nomicfoundation/ignition-core";
import { assert } from "chai";

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

/**
 * Check that the given deployment result matches some conditions.
 *
 * `expectedResult` is an object with expected modules results, which have
 * expected bindings results. These bindings results assert that that the
 * result of each binding is of the correct type, and it can also run
 * some custom predicate logic on the result to further verify it.
 */
export async function assertDeploymentState(
  hre: any,
  result: SerializedDeploymentResult,
  expectedResult: ExpectedDeploymentState
) {
  const modulesResults = Object.entries(result);
  const expectedModules = Object.entries(expectedResult);

  assert.equal(
    modulesResults.length,
    expectedModules.length,
    "Expected result and actual result have a different number of modules"
  );

  for (const [moduleId, moduleResult] of modulesResults) {
    const expectedModule = expectedResult[moduleId];

    assert.isDefined(
      expectedModule,
      `Module ${moduleId} is not part of the expected result`
    );

    assert.equal(
      Object.entries(moduleResult).length,
      Object.entries(expectedModule).length
    );

    for (const [bindingId, bindingResult] of Object.entries(moduleResult)) {
      const expectedBindingResult = expectedModule[bindingId];

      if (expectedBindingResult.kind === "contract") {
        const contract = await assertContract(hre, bindingResult);

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

/**
 * Deploy all the modules in `userModules`.
 *
 * Assert that `expectedBlocks.length` blocks are mined, and that
 * each mined block has `expectedBlocks[i]` transactions.
 */
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

async function assertContract(
  hre: any,
  bindingResult: SerializedBindingResult
) {
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

  return contract;
}

export function isContract(contract: any): contract is Contract {
  return contract.address !== undefined;
}

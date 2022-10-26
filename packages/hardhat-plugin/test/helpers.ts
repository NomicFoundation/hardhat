import {
  Recipe,
  SerializedFutureResult,
  SerializedDeploymentResult,
  DeploymentResult,
  IRecipeGraphBuilder,
  buildModule,
} from "@ignored/ignition-core";
import { ModuleDict } from "@ignored/ignition-core/src/types/module";
import { assert } from "chai";

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
type ExpectedRecipeResult = Record<string, ExpectedFutureResult>;
type ExpectedDeploymentState = Record<string, ExpectedRecipeResult>;

/**
 * Check that the given deployment result matches some conditions.
 *
 * `expectedResult` is an object with expected recipes results, which have
 * expected futures results. These futures results assert that that the
 * result of each future is of the correct type, and it can also run
 * some custom predicate logic on the result to further verify it.
 */
export async function assertDeploymentState(
  hre: any,
  result: SerializedDeploymentResult,
  expectedResult: ExpectedDeploymentState
) {
  const recipesResults = Object.entries(result);
  const expectedRecipes = Object.entries(expectedResult);

  assert.equal(
    recipesResults.length,
    expectedRecipes.length,
    "Expected result and actual result have a different number of recipes"
  );

  for (const [recipeId, recipeResult] of recipesResults) {
    const expectedRecipe = expectedResult[recipeId];

    assert.isDefined(
      expectedRecipe,
      `Recipe ${recipeId} is not part of the expected result`
    );

    assert.equal(
      Object.entries(recipeResult).length,
      Object.entries(expectedRecipe).length
    );

    for (const [futureId, futureResult] of Object.entries(recipeResult)) {
      const expectedFutureResult = expectedRecipe[futureId];

      if (expectedFutureResult.kind === "contract") {
        const contract = await assertContract(hre, futureResult);

        await expectedFutureResult.predicate(contract);
      } else if (expectedFutureResult.kind === "transaction") {
        if (futureResult._kind !== "tx") {
          assert.fail(
            `Expected future result to be a transaction, but got ${futureResult._kind}`
          );
        }
        assert.isDefined(futureResult.value.hash);
        await assertTxMined(hre, futureResult.value.hash);
      } else {
        assertNeverFutureResult(expectedFutureResult);
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
 * Deploy all the modules in `userModuless`.
 *
 * Assert that `expectedBlocks.length` blocks are mined, and that
 * each mined block has `expectedBlocks[i]` transactions.
 */
export async function deployModules(
  hre: any,
  userRecipes: Recipe[],
  expectedBlocks: number[]
): Promise<SerializedDeploymentResult> {
  await hre.run("compile", { quiet: true });

  const deploymentResultPromise: Promise<DeploymentResult> = hre.run(
    "deploy:deploy-modules",
    {
      userRecipes,
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

async function assertContract(hre: any, futureResult: SerializedFutureResult) {
  if (futureResult._kind !== "contract") {
    assert.fail(
      `Expected future result to be a contract, but got ${futureResult._kind}`
    );
  }

  await assertHasCode(hre, futureResult.value.address);

  const contract = await hre.ethers.getContractAt(
    futureResult.value.abi,
    futureResult.value.address
  );

  return contract;
}

export async function deployModule(
  hre: any,
  recipeDefinition: (m: IRecipeGraphBuilder) => ModuleDict,
  options?: { parameters: {} }
): Promise<any> {
  await hre.run("compile", { quiet: true });

  const userRecipe = buildModule("MyModule", recipeDefinition);

  const deployPromise = hre.ignition.deploy(userRecipe, {
    ...options,
    ui: false,
  });

  await mineBlocks(hre, [1, 1, 1], deployPromise);

  const result = await deployPromise;

  return result;
}

function assertNeverFutureResult(expectedFutureResult: never) {
  throw new Error(`Unextectped future result ${expectedFutureResult}`);
}

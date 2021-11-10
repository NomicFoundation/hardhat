import { assert } from "chai";
import { DeploymentResult, UserModule } from "ignition";

/**
 * Wait until there are at least `expectedCount` transactions in the mempool
 */
export async function waitForPendingTxs(hre: any, expectedCount: number) {
  while (true) {
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

type ExpectedBindingResult = "contract";
type ExpectedModuleResult = Record<string, ExpectedBindingResult>;
type ExpectedDeploymentResult = Record<string, ExpectedModuleResult>;

export async function assertDeploymentResult(
  hre: any,
  result: DeploymentResult,
  expectedResult: ExpectedDeploymentResult
) {
  const resultModules = result.getModules();
  const expectedModules = Object.entries(expectedResult);

  assert.equal(resultModules.length, expectedModules.length);

  for (const resultModule of resultModules) {
    const expectedModule = expectedResult[resultModule.moduleId];

    assert.isDefined(expectedModule);

    assert.equal(resultModule.count(), Object.entries(expectedModule).length);

    for (const [bindingId, expectedBindingResult] of Object.entries(
      expectedModule
    )) {
      const bindingResult = resultModule.getResult(bindingId);

      if (expectedBindingResult === "contract") {
        assert.isDefined(bindingResult.address);
        await assertHasCode(hre, bindingResult.address);
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

export async function deployModules(
  hre: any,
  userModules: Array<UserModule<any>>,
  expectedBlocks: number[]
): Promise<DeploymentResult> {
  await hre.run("compile", { quiet: true });

  const deploymentResultPromise: Promise<DeploymentResult> = hre.run(
    "deploy:deploy-modules",
    {
      userModules,
    }
  );

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  mineBlocks(hre, expectedBlocks);

  return deploymentResultPromise;
}

async function mineBlocks(hre: any, expectedBlocks: number[]) {
  for (const expectedPendingTxs of expectedBlocks) {
    await waitForPendingTxs(hre, expectedPendingTxs);
    await hre.network.provider.send("evm_mine");
  }
}

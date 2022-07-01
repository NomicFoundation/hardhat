import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import {
  assertDeploymentState,
  deployModules,
  resultAssertions,
} from "./helpers";
import { useEnvironment } from "./useEnvironment";

describe("contract calls", () => {
  useEnvironment("minimal");

  it("should call a function in a contract", async function () {
    // given
    const userModule = buildModule("MyModule", (m) => {
      const foo = m.contract("Foo");
      m.call(foo, "inc");
    });

    // when
    const deploymentResult = await deployModules(
      this.hre,
      [userModule],
      [1, 1]
    );

    // then
    await assertDeploymentState(this.hre, deploymentResult, {
      MyModule: {
        Foo: resultAssertions.contract(async (foo) => {
          assert.isTrue(await foo.isFoo());
          assert.equal(await foo.x(), 2);
        }),
        "Foo.inc": resultAssertions.transaction(),
      },
    });
  });

  it("should fail if a call fails", async function () {
    // given
    const userModule = buildModule("MyModule", (m) => {
      const foo = m.contract("Foo");

      m.call(foo, "incByPositiveNumber", {
        args: [0],
      });
    });

    // then
    await assert.isRejected(deployModules(this.hre, [userModule], [1, 1]));
  });
});

import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import {
  assertDeploymentState,
  deployModules,
  resultAssertions,
} from "./helpers";
import { useEnvironment } from "./useEnvironment";

describe("modules", () => {
  useEnvironment("minimal");

  it("should deploy two modules", async function () {
    // given
    const userModule1 = buildModule("MyModule1", (m) => {
      const foo = m.contract("Foo");

      return { foo };
    });
    const userModule2 = buildModule("MyModule2", (m) => {
      const { foo } = m.useModule(userModule1);

      m.call(foo, "inc");
    });

    // when
    const deploymentResult = await deployModules(
      this.hre,
      [userModule2, userModule1],
      [1, 1]
    );

    // then
    await assertDeploymentState(this.hre, deploymentResult, {
      MyModule1: {
        Foo: resultAssertions.contract(async (foo) => {
          assert.isTrue(await foo.isFoo());
          assert.equal(await foo.x(), 2);
        }),
      },
      MyModule2: {
        "Foo.inc": resultAssertions.transaction(),
      },
    });
  });
});

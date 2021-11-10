import { buildModule } from "ignition";
import { assertDeploymentResult, deployModules } from "./helpers";

import { useEnvironment } from "./useEnvironment";

describe("integration tests", function () {
  this.timeout(20000);
  useEnvironment("minimal");

  it("should deploy a contract", async function () {
    // given
    const userModule = buildModule("MyModule", (m) => {
      const foo = m.contract("Foo");

      return { foo };
    });

    // when
    const deploymentResult = await deployModules(this.hre, [userModule], [1]);

    // then
    await assertDeploymentResult(this.hre, deploymentResult, {
      MyModule: {
        Foo: "contract",
      },
    });
  });

  it("should deploy two contracts in parallel", async function () {
    // given
    const userModule = buildModule("MyModule", (m) => {
      const foo = m.contract("Foo");
      const bar = m.contract("Bar");

      return { foo, bar };
    });

    // when
    const deploymentResult = await deployModules(this.hre, [userModule], [2]);

    // then
    await assertDeploymentResult(this.hre, deploymentResult, {
      MyModule: {
        Foo: "contract",
        Bar: "contract",
      },
    });
  });

  it("should deploy two contracts sequentially", async function () {
    // given
    const userModule = buildModule("MyModule", (m) => {
      const foo = m.contract("Foo");
      const usesContract = m.contract("UsesContract", {
        args: [foo],
      });

      return { foo, usesFoo: usesContract };
    });

    // when
    const deploymentResult = await deployModules(
      this.hre,
      [userModule],
      [1, 1]
    );

    // then
    await assertDeploymentResult(this.hre, deploymentResult, {
      MyModule: {
        Foo: "contract",
        UsesContract: "contract",
      },
    });
  });
});

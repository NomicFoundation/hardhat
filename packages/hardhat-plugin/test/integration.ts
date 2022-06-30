import { buildModule, Contract } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import {
  assertDeploymentState,
  deployModules,
  resultAssertions,
} from "./helpers";
import { useEnvironment } from "./useEnvironment";

describe("integration tests", function () {
  this.timeout(5000);
  useEnvironment("minimal");

  it("should deploy a contract", async function () {
    // given
    const userModule = buildModule("MyModule", (m) => {
      m.contract("Foo");
    });

    // when
    const deploymentResult = await deployModules(this.hre, [userModule], [1]);

    // then
    await assertDeploymentState(this.hre, deploymentResult, {
      MyModule: {
        Foo: resultAssertions.contract(async (foo) => {
          assert.isTrue(await foo.isFoo());
        }),
      },
    });
  });

  it("should deploy two contracts in parallel", async function () {
    // given
    const userModule = buildModule("MyModule", (m) => {
      m.contract("Foo");
      m.contract("Bar");
    });

    // when
    const deploymentResult = await deployModules(this.hre, [userModule], [2]);

    // then
    await assertDeploymentState(this.hre, deploymentResult, {
      MyModule: {
        Foo: resultAssertions.contract(async (foo) => {
          assert.isTrue(await foo.isFoo());
        }),
        Bar: resultAssertions.contract(async (bar) => {
          assert.isTrue(await bar.isBar());
        }),
      },
    });
  });

  it("should deploy two contracts sequentially", async function () {
    // given
    const userModule = buildModule("MyModule", (m) => {
      const foo = m.contract("Foo");
      m.contract("UsesContract", {
        args: [foo],
      });
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
        }),
        UsesContract: resultAssertions.contract(async (usesContract) => {
          const contractAddress = await usesContract.contractAddress();
          const fooResult: any = deploymentResult.MyModule.Foo;

          assert.equal(contractAddress, fooResult.value.address);
        }),
      },
    });
  });

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

  it("should deploy two independent contracts and call a function in each one", async function () {
    // given
    const userModule = buildModule("MyModule", (m) => {
      const foo1 = m.contract("Foo", { id: "Foo1" });
      const foo2 = m.contract("Foo", { id: "Foo2" });
      m.call(foo1, "inc");
      m.call(foo2, "inc");
      m.call(foo2, "inc", { id: "Foo2.inc2" });
    });

    // when
    const deploymentResult = await deployModules(
      this.hre,
      [userModule],
      [2, 2, 1]
    );

    // then
    await assertDeploymentState(this.hre, deploymentResult, {
      MyModule: {
        Foo1: resultAssertions.contract(async (foo) => {
          assert.isTrue(await foo.isFoo());
          assert.equal(await foo.x(), 2);
        }),
        Foo2: resultAssertions.contract(async (foo) => {
          assert.isTrue(await foo.isFoo());
          assert.equal(await foo.x(), 3);
        }),
        "Foo1.inc": resultAssertions.transaction(),
        "Foo2.inc": resultAssertions.transaction(),
        "Foo2.inc2": resultAssertions.transaction(),
      },
    });
  });

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

  it("should deploy using existing contract", async function () {
    // given
    const originalModule = buildModule("FooModule", (m) => {
      const foo = m.contract("Foo");

      return { foo };
    });

    const originalDeploymentResult = await deployModules(
      this.hre,
      [originalModule],
      [1]
    );

    if (!isContract(originalDeploymentResult.FooModule.Foo.value)) {
      assert.fail("Expected contract deployed");
    }

    const { address, abi } = originalDeploymentResult.FooModule.Foo.value;

    const leveragingExistingModule = buildModule("ExistingFooModule", (m) => {
      const existingFoo = m.contractAt("ExistingFoo", address, abi);

      return { existingFoo };
    });

    // when
    const deploymentResult = await deployModules(
      this.hre,
      [leveragingExistingModule],
      [1]
    );

    // then
    await assertDeploymentState(this.hre, deploymentResult, {
      ExistingFooModule: {
        ExistingFoo: resultAssertions.contract(async (existingFoo) => {
          assert.isTrue(await existingFoo.isFoo());
        }),
      },
    });
  });

  describe("libraries", () => {
    it("should deploy a contract with a library", async function () {
      // given
      const withLibModule = buildModule("LibModule", (m) => {
        const rubbishMath = m.contract("RubbishMath");

        const dependsOnLib = m.contract("DependsOnLib", {
          libraries: {
            RubbishMath: rubbishMath,
          },
        });

        return { dependsOnLib };
      });

      // when
      const deploymentResult = await deployModules(
        this.hre,
        [withLibModule],
        [1, 1]
      );

      // then
      await assertDeploymentState(this.hre, deploymentResult, {
        LibModule: {
          RubbishMath: resultAssertions.contract(async (rubbishMath) => {
            assert.equal(await rubbishMath.add(1, 2), 3);
          }),
          DependsOnLib: resultAssertions.contract(async (dependsOnLib) => {
            assert.equal(await dependsOnLib.addThreeNumbers(1, 2, 3), 6);
          }),
        },
      });
    });

    it("should deploy a contract with an existing library", async function () {
      // given
      const rubbishMathLibModule = buildModule("RubbishMathLibModule", (m) => {
        const rubbishMath = m.contract("RubbishMath");

        return { rubbishMath };
      });

      const rubbishMathDeploymentResult = await deployModules(
        this.hre,
        [rubbishMathLibModule],
        [1]
      );

      if (
        !isContract(
          rubbishMathDeploymentResult.RubbishMathLibModule.RubbishMath.value
        )
      ) {
        assert.fail("Expected library deployed");
      }

      const { address, abi } =
        rubbishMathDeploymentResult.RubbishMathLibModule.RubbishMath.value;

      const withLibModule = buildModule("LibModule", (m) => {
        const rubbishMath = m.contractAt("RubbishMath", address, abi);

        const dependsOnLib = m.contract("DependsOnLib", {
          libraries: {
            RubbishMath: rubbishMath,
          },
        });

        return { dependsOnLib };
      });

      // when
      const deploymentResult = await deployModules(
        this.hre,
        [withLibModule],
        [1]
      );

      // then
      await assertDeploymentState(this.hre, deploymentResult, {
        LibModule: {
          RubbishMath: resultAssertions.contract(async (rubbishMath) => {
            assert.equal(await rubbishMath.add(1, 2), 3);
          }),
          DependsOnLib: resultAssertions.contract(async (dependsOnLib) => {
            assert.equal(await dependsOnLib.addThreeNumbers(1, 2, 3), 6);
          }),
        },
      });
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

function isContract(contract: any): contract is Contract {
  return contract.address !== undefined;
}

import { buildRecipe } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import {
  assertDeploymentState,
  deployRecipes,
  isContract,
  resultAssertions,
} from "./helpers";
import { useEnvironment } from "./useEnvironment";

describe("contract deploys", () => {
  useEnvironment("minimal");

  describe("local", () => {
    it("should deploy a contract", async function () {
      // given
      const userRecipe = buildRecipe("MyRecipe", (m) => {
        m.contract("Foo");
      });

      // when
      const deploymentResult = await deployRecipes(this.hre, [userRecipe], [1]);

      // then
      await assertDeploymentState(this.hre, deploymentResult, {
        MyRecipe: {
          Foo: resultAssertions.contract(async (foo) => {
            assert.isTrue(await foo.isFoo());
          }),
        },
      });
    });

    it("should deploy two contracts in parallel", async function () {
      // given
      const userRecipe = buildRecipe("MyRecipe", (m) => {
        m.contract("Foo");
        m.contract("Bar");
      });

      // when
      const deploymentResult = await deployRecipes(this.hre, [userRecipe], [2]);

      // then
      await assertDeploymentState(this.hre, deploymentResult, {
        MyRecipe: {
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
      const userRecipe = buildRecipe("MyRecipe", (m) => {
        const foo = m.contract("Foo");
        m.contract("UsesContract", {
          args: [foo],
        });
      });

      // when
      const deploymentResult = await deployRecipes(
        this.hre,
        [userRecipe],
        [1, 1]
      );

      // then
      await assertDeploymentState(this.hre, deploymentResult, {
        MyRecipe: {
          Foo: resultAssertions.contract(async (foo) => {
            assert.isTrue(await foo.isFoo());
          }),
          UsesContract: resultAssertions.contract(async (usesContract) => {
            const contractAddress = await usesContract.contractAddress();
            const fooResult: any = deploymentResult.MyRecipe.Foo;

            assert.equal(contractAddress, fooResult.value.address);
          }),
        },
      });
    });

    it("should deploy two independent contracts and call a function in each one", async function () {
      // given
      const userRecipe = buildRecipe("MyRecipe", (m) => {
        const foo1 = m.contract("Foo", { id: "Foo1" });
        const foo2 = m.contract("Foo", { id: "Foo2" });
        m.call(foo1, "inc");
        m.call(foo2, "inc");
        m.call(foo2, "inc", { id: "Foo2.inc2" });
      });

      // when
      const deploymentResult = await deployRecipes(
        this.hre,
        [userRecipe],
        [2, 2, 1]
      );

      // then
      await assertDeploymentState(this.hre, deploymentResult, {
        MyRecipe: {
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

    describe("libraries", () => {
      it("should deploy a contract with a library", async function () {
        // given
        const withLibRecipe = buildRecipe("LibRecipe", (m) => {
          const rubbishMath = m.contract("RubbishMath");

          const dependsOnLib = m.contract("DependsOnLib", {
            libraries: {
              RubbishMath: rubbishMath,
            },
          });

          return { dependsOnLib };
        });

        // when
        const deploymentResult = await deployRecipes(
          this.hre,
          [withLibRecipe],
          [1, 1]
        );

        // then
        await assertDeploymentState(this.hre, deploymentResult, {
          LibRecipe: {
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
        const rubbishMathLibRecipe = buildRecipe(
          "RubbishMathLibRecipe",
          (m) => {
            const rubbishMath = m.contract("RubbishMath");

            return { rubbishMath };
          }
        );

        const rubbishMathDeploymentResult = await deployRecipes(
          this.hre,
          [rubbishMathLibRecipe],
          [1]
        );

        if (
          !isContract(
            rubbishMathDeploymentResult.RubbishMathLibRecipe.RubbishMath.value
          )
        ) {
          assert.fail("Expected library deployed");
        }

        const { address, abi } =
          rubbishMathDeploymentResult.RubbishMathLibRecipe.RubbishMath.value;

        const withLibRecipe = buildRecipe("LibRecipe", (m) => {
          const rubbishMath = m.contractAt("RubbishMath", address, abi);

          const dependsOnLib = m.contract("DependsOnLib", {
            libraries: {
              RubbishMath: rubbishMath,
            },
          });

          return { dependsOnLib };
        });

        // when
        const deploymentResult = await deployRecipes(
          this.hre,
          [withLibRecipe],
          [1]
        );

        // then
        await assertDeploymentState(this.hre, deploymentResult, {
          LibRecipe: {
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
  });

  describe("abi/bytecodes", () => {
    it("should deploy a contract", async function () {
      const artifact = await this.hre.artifacts.readArtifact("Foo");

      // given
      const userRecipe = buildRecipe("MyRecipe", (m) => {
        m.contract("Foo", artifact);
      });

      // when
      const deploymentResult = await deployRecipes(this.hre, [userRecipe], [1]);

      // then
      await assertDeploymentState(this.hre, deploymentResult, {
        MyRecipe: {
          Foo: resultAssertions.contract(async (foo) => {
            assert.isTrue(await foo.isFoo());
          }),
        },
      });
    });

    describe("libraries", () => {
      it("should deploy a contract with a library", async function () {
        const rubbishMathArtifact = await this.hre.artifacts.readArtifact(
          "RubbishMath"
        );

        // given
        const withLibRecipe = buildRecipe("LibRecipe", (m) => {
          const rubbishMath = m.contract("RubbishMath", rubbishMathArtifact);

          const dependsOnLib = m.contract("DependsOnLib", {
            libraries: {
              RubbishMath: rubbishMath,
            },
          });

          return { dependsOnLib };
        });

        // when
        const deploymentResult = await deployRecipes(
          this.hre,
          [withLibRecipe],
          [1, 1]
        );

        // then
        await assertDeploymentState(this.hre, deploymentResult, {
          LibRecipe: {
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
  });

  describe("existing", () => {
    it("should deploy using existing contract", async function () {
      // given
      const originalRecipe = buildRecipe("FooRecipe", (m) => {
        const foo = m.contract("Foo");

        return { foo };
      });

      const originalDeploymentResult = await deployRecipes(
        this.hre,
        [originalRecipe],
        [1]
      );

      if (!isContract(originalDeploymentResult.FooRecipe.Foo.value)) {
        assert.fail("Expected contract deployed");
      }

      const { address, abi } = originalDeploymentResult.FooRecipe.Foo.value;

      const leveragingExistingRecipe = buildRecipe("ExistingFooRecipe", (m) => {
        const existingFoo = m.contractAt("ExistingFoo", address, abi);

        return { existingFoo };
      });

      // when
      const deploymentResult = await deployRecipes(
        this.hre,
        [leveragingExistingRecipe],
        [1]
      );

      // then
      await assertDeploymentState(this.hre, deploymentResult, {
        ExistingFooRecipe: {
          ExistingFoo: resultAssertions.contract(async (existingFoo) => {
            assert.isTrue(await existingFoo.isFoo());
          }),
        },
      });
    });
  });
});

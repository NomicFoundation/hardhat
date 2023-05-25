import { assert } from "chai";

import { defineModule } from "../../src/new-api/define-module";
import { NamedContractDeploymentFutureImplementation } from "../../src/new-api/internal/module";
import { ModuleConstructor } from "../../src/new-api/internal/module-builder";

describe("getParameter", () => {
  it("should record given parameters", () => {
    const constructor = new ModuleConstructor({
      TestModule: { param1: 42 },
    });

    assert.equal(constructor.parameters.TestModule.param1, 42);
  });

  it("should allow a parameter to be passed as an arg", () => {
    const moduleWithParamsDefinition = defineModule("Module1", (m) => {
      const arg1 = m.getParameter("param1");
      const contract1 = m.contract("Contract1", [arg1]);

      return { contract1 };
    });

    const constructor = new ModuleConstructor({
      Module1: { param1: "arg1" },
    });
    const moduleWithParams = constructor.construct(moduleWithParamsDefinition);

    assert.isDefined(moduleWithParams);

    const contractFuture = [...moduleWithParams.futures].find(
      ({ id }) => id === "Module1:Contract1"
    );

    if (
      !(contractFuture instanceof NamedContractDeploymentFutureImplementation)
    ) {
      assert.fail("Not a named contract deployment");
    }

    assert.equal(contractFuture.constructorArgs.length, 1);
    assert.equal(contractFuture.constructorArgs[0], "arg1");
  });

  it("should allow a parameter to have a default value", () => {
    const moduleWithParamsDefinition = defineModule("Module1", (m) => {
      const arg1 = m.getParameter("param1", "arg1");
      const arg2 = m.getParameter("param2", 42);
      const contract1 = m.contract("Contract1", [arg1, arg2]);

      return { contract1 };
    });

    const constructor = new ModuleConstructor({
      Module1: {
        param1: "overriddenParam",
      },
    });
    const moduleWithParams = constructor.construct(moduleWithParamsDefinition);

    assert.isDefined(moduleWithParams);

    const contractFuture = [...moduleWithParams.futures].find(
      ({ id }) => id === "Module1:Contract1"
    );

    if (
      !(contractFuture instanceof NamedContractDeploymentFutureImplementation)
    ) {
      assert.fail("Not a named contract deployment");
    }

    assert.equal(contractFuture.constructorArgs.length, 2);
    assert.equal(contractFuture.constructorArgs[0], "overriddenParam");
    assert.equal(contractFuture.constructorArgs[1], 42);
  });

  it("should throw if a parameter has no value", () => {
    const moduleWithParamsDefinition = defineModule("Module1", (m) => {
      const arg1 = m.getParameter<string>("param1");
      const contract1 = m.contract("Contract1", [arg1]);

      return { contract1 };
    });

    const constructor = new ModuleConstructor();

    assert.throws(
      () => constructor.construct(moduleWithParamsDefinition),
      /Module parameter 'param1' is required, but none was given/
    );
  });
});

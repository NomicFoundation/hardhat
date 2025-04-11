import { assert } from "chai";

import {
  ArgumentType,
  SolidityParameterType,
  isAccountRuntimeValue,
} from "../../src/index.js";
import {
  AccountRuntimeValueImplementation,
  ModuleParameterRuntimeValueImplementation,
  NamedContractAtFutureImplementation,
} from "../../src/internal/module.js";
import { replaceWithinArg } from "../../src/internal/utils/replace-within-arg.js";

describe("Arg resolution", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

  let resolve: (arg: ArgumentType) => SolidityParameterType;

  beforeEach(() => {
    resolve = (arg: ArgumentType) =>
      replaceWithinArg<SolidityParameterType>(arg, {
        accountRuntimeValue: (arv) => ({
          _kind: "AccountRuntimeValue",
          accountIndex: arv.accountIndex,
        }),
        moduleParameterRuntimeValue: (mprv) => ({
          _kind: "ModuleParameterRuntimeValue",
          moduleId: mprv.moduleId,
          name: mprv.name,
          defaultValue:
            mprv.defaultValue === undefined
              ? "na"
              : isAccountRuntimeValue(mprv.defaultValue)
                ? {
                    _kind: "AccountRuntimeValue",
                    accountIndex: mprv.defaultValue.accountIndex,
                  }
                : mprv.defaultValue,
        }),
        bigint: (bi) => `${bi.toString()}n`,
        future: (f) => ({ _kind: "FutureToken", futureId: f.id }),
      });
  });

  it("should create a duplicate of value arg types", () => {
    assertEqualBeforeAndAfterResolution(resolve, 1);
    assertEqualBeforeAndAfterResolution(resolve, "abc");
    assertEqualBeforeAndAfterResolution(resolve, false);
    assertEqualBeforeAndAfterResolution(resolve, [1, "abc", false]);

    assertEqualBeforeAndAfterResolution(resolve, {
      num: 1,
      string: "abc",
      bool: true,
      array: [1, "abc", false],
      nested: {
        bool: false,
        string: "another",
      },
    });
  });

  describe("account runtime values", () => {
    it("should substitue a singleton", () => {
      const actual = resolve(new AccountRuntimeValueImplementation(3));

      assert.deepStrictEqual(actual, {
        _kind: "AccountRuntimeValue",
        accountIndex: 3,
      });
    });

    it("should substitue in an array", () => {
      const actual = resolve([
        1,
        new AccountRuntimeValueImplementation(2),
        "c",
      ]);

      assert.deepStrictEqual(actual, [
        1,
        {
          _kind: "AccountRuntimeValue",
          accountIndex: 2,
        },
        "c",
      ]);
    });

    it("should substitue in an object", () => {
      const actual = resolve({
        num: 1,
        account: new AccountRuntimeValueImplementation(2),
        string: "c",
        nested: {
          subaccount: new AccountRuntimeValueImplementation(4),
        },
      });

      assert.deepStrictEqual(actual, {
        num: 1,
        account: {
          _kind: "AccountRuntimeValue",
          accountIndex: 2,
        },
        string: "c",
        nested: {
          subaccount: {
            _kind: "AccountRuntimeValue",
            accountIndex: 4,
          },
        },
      });
    });
  });

  describe("module parameter runtime values", () => {
    it("should substitue a singleton", () => {
      const actual = resolve(
        new ModuleParameterRuntimeValueImplementation(
          "MyModule",
          "supply",
          BigInt(12),
        ),
      );

      assert.deepStrictEqual(actual, {
        _kind: "ModuleParameterRuntimeValue",
        moduleId: "MyModule",
        name: "supply",
        defaultValue: BigInt(12),
      });
    });

    it("should substitue in an array", () => {
      const actual = resolve([
        1,
        new ModuleParameterRuntimeValueImplementation(
          "MyModule",
          "supply",
          BigInt(12),
        ),
        "c",
      ]);

      assert.deepStrictEqual(actual, [
        1,
        {
          _kind: "ModuleParameterRuntimeValue",
          moduleId: "MyModule",
          name: "supply",
          defaultValue: BigInt(12),
        },
        "c",
      ]);
    });

    it("should substitue in an object", () => {
      const actual = resolve({
        num: 1,
        account: new ModuleParameterRuntimeValueImplementation(
          "MyModule",
          "supply",
          BigInt(2),
        ),
        string: "c",
        nested: {
          subaccount: new ModuleParameterRuntimeValueImplementation(
            "MyModule",
            "ticker",
            "CodeCoin",
          ),
        },
      });

      assert.deepStrictEqual(actual, {
        num: 1,
        account: {
          _kind: "ModuleParameterRuntimeValue",
          moduleId: "MyModule",
          name: "supply",
          defaultValue: BigInt(2),
        },
        string: "c",
        nested: {
          subaccount: {
            _kind: "ModuleParameterRuntimeValue",
            moduleId: "MyModule",
            name: "ticker",
            defaultValue: "CodeCoin",
          },
        },
      });
    });
  });

  describe("BigInt", () => {
    it("should substitue a singleton", () => {
      const actual = resolve(BigInt(12));

      assert.deepStrictEqual(actual, "12n");
    });

    it("should substitue in an array", () => {
      const actual = resolve([1, BigInt(12), "c"]);

      assert.deepStrictEqual(actual, [1, "12n", "c"]);
    });

    it("should substitue in an object", () => {
      const actual = resolve({
        num: 1,
        bigint: BigInt(2),
        string: "c",
        nested: {
          bigint: BigInt(4),
        },
      });

      assert.deepStrictEqual(actual, {
        num: 1,
        bigint: "2n",
        string: "c",
        nested: {
          bigint: "4n",
        },
      });
    });
  });

  describe("future", () => {
    it("should substitue a singleton", () => {
      const actual = resolve(
        new NamedContractAtFutureImplementation(
          "MyModule:MyContract",
          {} as any,
          "MyContract",
          exampleAddress,
        ),
      );

      assert.deepStrictEqual(actual, {
        _kind: "FutureToken",
        futureId: "MyModule:MyContract",
      });
    });

    it("should substitue in an array", () => {
      const actual = resolve([
        1,
        new NamedContractAtFutureImplementation(
          "MyModule:MyContract",
          {} as any,
          "MyContract",
          exampleAddress,
        ),
        "c",
      ]);

      assert.deepStrictEqual(actual, [
        1,
        {
          _kind: "FutureToken",
          futureId: "MyModule:MyContract",
        },
        "c",
      ]);
    });

    it("should substitue in an object", () => {
      const actual = resolve({
        num: 1,
        future: new NamedContractAtFutureImplementation(
          "MyModule:MyContract1",
          {} as any,
          "MyContract1",
          exampleAddress,
        ),
        string: "c",
        nested: {
          future: new NamedContractAtFutureImplementation(
            "MyModule:MyContract2",
            {} as any,
            "MyContract2",
            exampleAddress,
          ),
        },
      });

      assert.deepStrictEqual(actual, {
        num: 1,
        future: {
          _kind: "FutureToken",
          futureId: "MyModule:MyContract1",
        },
        string: "c",
        nested: {
          future: {
            _kind: "FutureToken",
            futureId: "MyModule:MyContract2",
          },
        },
      });
    });
  });
});

function assertEqualBeforeAndAfterResolution(
  resolve: (arg: ArgumentType) => SolidityParameterType,
  arg: ArgumentType,
) {
  const before = arg;

  const after = resolve(before);

  assert.deepStrictEqual(
    after,
    before,
    "After should be a structural clone of before",
  );
}

import { expect } from "chai";
import { network } from "hardhat";
import type {
  ChainType,
  DefaultChainType,
  NetworkConnection,
  NetworkConnectionParams,
} from "hardhat/types/network";
import type { Counter } from "../../types/ethers-contracts/contracts/Counter.js";

// This should be in `network.mocha` so that users' don't need to import nor
// install hardhat-mocha directly.
/**
 * Connects to the network in Mocha's `before` hook. Optionally closing the
 * connection in Mocha's `after` hook.
 *
 * @param networkOrParams The parameters used for network.connect().
 * @param closeOnAfter Close the connection on Mocha's `after` hook. Defaults
 * to `true`.
 * @returns
 */
function connectOnBefore<
  ChainTypeT extends ChainType | string = DefaultChainType,
>(
  networkOrParams?: NetworkConnectionParams<ChainTypeT> | string,
  closeOnAfter: boolean = true,
): NetworkConnection<ChainTypeT> {
  let resolved: NetworkConnection<ChainTypeT> | undefined;

  // Register the Mocha `before` hook to connect before tests run.
  before(async function () {
    console.log("connecting");
    resolved = await network.connect(networkOrParams);
  });

  // Optionally tear down after tests.
  after(async function () {
    if (resolved !== undefined && closeOnAfter) {
      await resolved.close();
      resolved = undefined;
    }
  });

  // NOTE: This should be in its own file and properly tested. Claude inlined it

  // Creates a lazy proxy for a given property path. When a user destructures
  // like `const { ethers } = connectOnBefore(...)`, `ethers` becomes a proxy
  // that defers access until `resolved` is populated.
  function createNestedProxy(getTarget: () => unknown): any {
    return new Proxy(Object.create(null), {
      get(_obj, prop, receiver) {
        // Support common inspection/coercion symbols without throwing.
        if (prop === Symbol.toPrimitive || prop === Symbol.toStringTag) {
          const t = getTarget();
          if (t == null) return undefined;
          return Reflect.get(t as object, prop, receiver);
        }

        // `then` must return undefined so the proxy is not mistaken for a
        // thenable (e.g. when returned from an async context or awaited).
        if (prop === "then") return undefined;

        const target = getTarget();
        if (target == null) {
          throw new Error(
            `Cannot access property '${String(prop)}' before the \`before\` hook runs. ` +
              `Make sure you only access this inside \`it\`, \`before\`, \`beforeEach\`, etc.`,
          );
        }

        const val = Reflect.get(target as object, prop, receiver);
        // Bind functions so they retain their original `this`.
        if (typeof val === "function") {
          return val.bind(target);
        }
        return val;
      },

      set(_obj, prop, value) {
        const target = getTarget();
        if (target == null) {
          throw new Error(
            `Cannot set property '${String(prop)}' before the \`before\` hook runs.`,
          );
        }
        return Reflect.set(target as object, prop, value);
      },

      has(_obj, prop) {
        const target = getTarget();
        if (target == null) return false;
        return Reflect.has(target as object, prop);
      },

      ownKeys() {
        const target = getTarget();
        if (target == null) return [];
        return Reflect.ownKeys(target as object);
      },

      getOwnPropertyDescriptor(_obj, prop) {
        const target = getTarget();
        if (target == null) return undefined;
        return Reflect.getOwnPropertyDescriptor(target as object, prop);
      },

      apply(_obj, thisArg, args) {
        const target = getTarget();
        if (target == null) {
          throw new Error(
            `Cannot call this value before the \`before\` hook runs.`,
          );
        }
        return Reflect.apply(target as Function, thisArg, args);
      },
    });
  }

  // The root proxy — represents the NetworkConnection itself.
  // When destructured, each accessed property returns a nested proxy
  // that lazily reads from `resolved[prop]`.
  const rootProxy = new Proxy(Object.create(null), {
    get(_obj, prop, receiver) {
      if (prop === Symbol.toPrimitive || prop === Symbol.toStringTag) {
        if (resolved == null) return undefined;
        return Reflect.get(resolved as object, prop, receiver);
      }

      if (prop === "then") return undefined;

      // If already resolved, return the real value directly.
      if (resolved !== undefined) {
        const val = Reflect.get(resolved as object, prop, receiver);
        if (typeof val === "function") {
          return val.bind(resolved);
        }
        return val;
      }

      // Not yet resolved — return a nested proxy so destructuring works.
      // `const { ethers } = connectOnBefore(...)` will capture a proxy here
      // that defers to `resolved.ethers` once the `before` hook fires.
      return createNestedProxy(() => {
        if (resolved === undefined) return undefined;
        const val = Reflect.get(resolved as object, prop);
        return val;
      });
    },

    set(_obj, prop, value) {
      if (resolved == null) {
        throw new Error(
          `Cannot set property '${String(prop)}' before the \`before\` hook runs.`,
        );
      }
      return Reflect.set(resolved as object, prop, value);
    },

    has(_obj, prop) {
      if (resolved == null) return false;
      return Reflect.has(resolved as object, prop);
    },

    ownKeys() {
      if (resolved == null) return [];
      return Reflect.ownKeys(resolved as object);
    },

    getOwnPropertyDescriptor(_obj, prop) {
      if (resolved == null) return undefined;
      return Reflect.getOwnPropertyDescriptor(resolved as object, prop);
    },
  });

  return rootProxy as NetworkConnection<ChainTypeT>;
}

describe("Counter", function () {
  const { ethers } = /* network.mocha. */ connectOnBefore();

  let counter: Counter;
  beforeEach(async function () {
    counter = await ethers.deployContract("Counter");
  });

  it("Should emit the Increment event when calling the inc() function", async function () {
    await expect(counter.inc()).to.emit(counter, "Increment").withArgs(1n);
  });

  it("The sum of the Increment events should match the current value", async function () {
    const deploymentBlockNumber = await ethers.provider.getBlockNumber();

    // run a series of increments
    for (let i = 1; i <= 10; i++) {
      await counter.incBy(i);
    }

    const events = await counter.queryFilter(
      counter.filters.Increment(),
      deploymentBlockNumber,
      "latest",
    );

    // check that the aggregated events match the current value
    let total = 0n;
    for (const event of events) {
      total += event.args.by;
    }

    expect(await counter.x()).to.equal(total);
  });
});

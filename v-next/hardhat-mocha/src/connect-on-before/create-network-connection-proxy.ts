import type {
  ChainType,
  DefaultChainType,
  NetworkConnection,
} from "hardhat/types/network";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

/**
 * Creates a proxy that stands in for a `NetworkConnection` which has not yet
 * been resolved. Property access on the proxy is forwarded to the real
 * connection once it becomes available (i.e. after the Mocha `before` hook
 * runs).
 *
 * If the connection has not been resolved yet and a property is accessed, a
 * nested proxy is returned instead. This allows destructuring at the
 * `describe` level (e.g. `const { ethers } = connectOnBefore(...)`) to work
 * — the destructured value stays lazy until it is actually used inside a test.
 *
 * @param getResolved A thunk that returns the resolved connection, or
 *   `undefined` if it has not been resolved yet.
 * @returns A proxy typed as `NetworkConnection<ChainTypeT>`.
 */
export function createNetworkConnectionProxy<
  ChainTypeT extends ChainType | string = DefaultChainType,
>(
  getResolved: () => NetworkConnection<ChainTypeT> | undefined,
): NetworkConnection<ChainTypeT> {
  const NetworkConnectionProxy = () => {};
  const stringRepresentation = "<NetworkConnectionProxy>";

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- 
    We use this cast instead of Object.create(null) because the name leaks in 
    `util.inspect` when using `node:test` */
  return new Proxy(NetworkConnectionProxy as any, {
    ...defaultProxyHandlerTraps,

    get(_obj, prop) {
      const resolved = getResolved();

      if (prop === "then") {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.AWAIT_CONNECT_ON_BEFORE,
        );
      }

      // If already resolved, return the real value directly.
      if (resolved !== undefined) {
        const val = Reflect.get(resolved, prop);

        if (typeof val === "function") {
          return val.bind(resolved);
        }

        return val;
      }

      // Not yet resolved — return a nested proxy so destructuring works.
      // `const { ethers } = connectOnBefore(...)` will capture a proxy here
      // that defers to `resolved.ethers` once the `before` hook fires.
      return createNestedProxyForPath(() => {
        const r = getResolved();

        if (r === undefined) {
          return undefined;
        }

        const val = Reflect.get(r, prop);

        return val;
      });
    },

    set(_obj, prop, value) {
      const resolved = getResolved();

      if (resolved === null || resolved === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.USE_BEFORE_HOOK,
        );
      }

      return Reflect.set(resolved, prop, value);
    },

    has(_obj, prop) {
      const resolved = getResolved();

      if (resolved === null || resolved === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.USE_BEFORE_HOOK,
        );
      }

      return Reflect.has(resolved, prop);
    },

    ownKeys() {
      const resolved = getResolved();

      if (resolved === null || resolved === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.USE_BEFORE_HOOK,
        );
      }

      return Reflect.ownKeys(resolved);
    },

    getOwnPropertyDescriptor(_obj, prop) {
      const resolved = getResolved();

      if (resolved === null || resolved === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.USE_BEFORE_HOOK,
        );
      }

      return Reflect.getOwnPropertyDescriptor(resolved, prop);
    },
  });
}

// Creates a lazy proxy for a given property path. When a user destructures
// like `const { ethers } = connectOnBefore(...)`, `ethers` becomes a proxy
// that defers access until `resolved` is populated.
function createNestedProxyForPath(getTarget: () => unknown): any {
  // Use an arrow function as the proxy target so the `apply` trap works when
  // the resolved value turns out to be callable (e.g. `deployContract`).
  // An arrow function (unlike `function(){}`) has no `prototype` property,
  // which avoids proxy invariant issues with the `ownKeys` trap.
  const NetworkConnectionPropertyProxy = () => {};
  const stringRepresentation = "<NetworkConnectionPropertyProxy>";

  return new Proxy(NetworkConnectionPropertyProxy, {
    ...defaultProxyHandlerTraps,

    get(_obj, prop) {
      const target = getTarget();

      // Already resolved — return the real value.
      if (target !== null && target !== undefined) {
        const val = Reflect.get(target, prop);

        // Bind functions so they retain their original `this`.
        if (typeof val === "function") {
          return val.bind(target);
        }

        return val;
      }

      if (prop === Symbol.toStringTag || prop === "toString") {
        return () => stringRepresentation;
      }

      // Not yet resolved — return a further nested proxy so multi-level
      // destructuring works (e.g. `const { ethers: { deployContract } } = ...`).
      return createNestedProxyForPath(() => {
        const parent = getTarget();

        if (parent === null || parent === undefined) {
          return undefined;
        }

        return Reflect.get(parent, prop);
      });
    },

    set(_obj, prop, value) {
      const target = getTarget();

      if (target === null || target === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.USE_BEFORE_HOOK,
        );
      }

      return Reflect.set(target, prop, value);
    },

    has(_obj, prop) {
      const target = getTarget();

      if (target === null || target === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.USE_BEFORE_HOOK,
        );
      }

      return Reflect.has(target, prop);
    },

    ownKeys() {
      const target = getTarget();

      if (target === null || target === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.USE_BEFORE_HOOK,
        );
      }

      return Reflect.ownKeys(target);
    },

    getOwnPropertyDescriptor(_obj, prop) {
      const target = getTarget();

      if (target === null || target === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.USE_BEFORE_HOOK,
        );
      }

      return Reflect.getOwnPropertyDescriptor(target, prop);
    },

    apply(_obj, thisArg, args) {
      const target = getTarget();

      if (target === null || target === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.USE_BEFORE_HOOK,
        );
      }

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Reflect operations require Function type
      return Reflect.apply(target as Function, thisArg, args);
    },
  });
}

/**
 * Default proxy handler traps that throw `UNSUPPORTED_OPERATION` for every
 * trap. Spread this into each `new Proxy(...)` handler and override only the
 * traps that should be forwarded to the resolved object. This ensures no trap
 * falls through to the default behaviour (which would operate on the dummy
 * proxy target instead of the real connection).
 */
const defaultProxyHandlerTraps: Required<ProxyHandler<object>> = {
  apply() {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.UNSUPPORTED_OPERATION,
    );
  },
  construct() {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.UNSUPPORTED_OPERATION,
    );
  },
  defineProperty() {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.UNSUPPORTED_OPERATION,
    );
  },
  deleteProperty() {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.UNSUPPORTED_OPERATION,
    );
  },
  get() {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.UNSUPPORTED_OPERATION,
    );
  },
  getOwnPropertyDescriptor() {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.UNSUPPORTED_OPERATION,
    );
  },
  getPrototypeOf() {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.UNSUPPORTED_OPERATION,
    );
  },
  has() {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.UNSUPPORTED_OPERATION,
    );
  },
  isExtensible() {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.UNSUPPORTED_OPERATION,
    );
  },
  ownKeys() {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.UNSUPPORTED_OPERATION,
    );
  },
  preventExtensions() {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.UNSUPPORTED_OPERATION,
    );
  },
  set() {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.UNSUPPORTED_OPERATION,
    );
  },
  setPrototypeOf() {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.UNSUPPORTED_OPERATION,
    );
  },
};

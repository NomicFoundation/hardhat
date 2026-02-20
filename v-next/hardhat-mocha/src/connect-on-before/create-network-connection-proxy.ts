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
  return new Proxy(Object.create(null), {
    get(_obj, prop) {
      const resolved = getResolved();

      if (prop === Symbol.toPrimitive || prop === Symbol.toStringTag) {
        if (resolved === null || resolved === undefined) {
          return undefined;
        }

        return Reflect.get(resolved, prop);
      }

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
          HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.SET_BEFORE_HOOK,
          { property: String(prop) },
        );
      }

      return Reflect.set(resolved, prop, value);
    },

    has(_obj, prop) {
      const resolved = getResolved();

      if (resolved === null || resolved === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.ACCESS_BEFORE_HOOK,
          { property: String(prop) },
        );
      }

      return Reflect.has(resolved, prop);
    },

    ownKeys() {
      const resolved = getResolved();

      if (resolved === null || resolved === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.ENUMERATE_BEFORE_HOOK,
        );
      }

      return Reflect.ownKeys(resolved);
    },

    getOwnPropertyDescriptor(_obj, prop) {
      const resolved = getResolved();

      if (resolved === null || resolved === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.ACCESS_BEFORE_HOOK,
          { property: String(prop) },
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
  return new Proxy(Object.create(null), {
    get(_obj, prop) {
      // Support common inspection/coercion symbols without throwing.
      if (prop === Symbol.toPrimitive || prop === Symbol.toStringTag) {
        const t = getTarget();

        if (t === null || t === undefined) {
          return undefined;
        }

        return Reflect.get(t, prop);
      }

      // `then` must return undefined so the proxy is not mistaken for a
      // thenable (e.g. when returned from an async context or awaited).
      if (prop === "then") {
        return undefined;
      }

      const target = getTarget();
      if (target === null || target === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.ACCESS_BEFORE_HOOK,
          { property: String(prop) },
        );
      }

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Reflect operations require object type
      const val = Reflect.get(target as object, prop);

      // Bind functions so they retain their original `this`.
      if (typeof val === "function") {
        return val.bind(target);
      }

      return val;
    },

    set(_obj, prop, value) {
      const target = getTarget();

      if (target === null || target === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.SET_BEFORE_HOOK,
          { property: String(prop) },
        );
      }

      return Reflect.set(target, prop, value);
    },

    has(_obj, prop) {
      const target = getTarget();

      if (target === null || target === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.ACCESS_BEFORE_HOOK,
          { property: String(prop) },
        );
      }

      return Reflect.has(target, prop);
    },

    ownKeys() {
      const target = getTarget();

      if (target === null || target === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.ENUMERATE_BEFORE_HOOK,
        );
      }

      return Reflect.ownKeys(target);
    },

    getOwnPropertyDescriptor(_obj, prop) {
      const target = getTarget();

      if (target === null || target === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.ACCESS_BEFORE_HOOK,
          { property: String(prop) },
        );
      }

      return Reflect.getOwnPropertyDescriptor(target, prop);
    },

    apply(_obj, thisArg, args) {
      const target = getTarget();

      if (target === null || target === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.CALL_BEFORE_HOOK,
        );
      }

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Reflect operations require Function type
      return Reflect.apply(target as Function, thisArg, args);
    },
  });
}

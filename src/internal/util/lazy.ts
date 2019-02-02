import { BuidlerError, ERRORS } from "../core/errors";

/**
 * This module provides function to implement proxy-based object, functions, and
 * classes (they are functions). They receive an initializer function that it's
 * not used until someone interacts with the lazy element.
 *
 * This functions can also be used like a lazy `require`, creating a proxy that
 * doesn't require the module until needed.
 *
 * The disadvantage of using this technique is that the type information is
 * lost wrt `import`, as `require` returns an `any. If done with enough care,
 * this can be manually fixed.
 *
 * TypeScript doesn't emit `require` calls for modules that are imported only
 * because of their types. So if one uses lazyObject or lazyFunction along with
 * a normal ESM import you can pass the module's type to this function.
 *
 * An example of this can be:
 *
 *    import findUpT from "find-up";
 *    export const findUp = lazyFunction<typeof findUpT>(() => require("find-up"));
 *
 * You can also use it with named exports:
 *
 *    import { EthT } from "web3x/eth";
 *    const Eth = lazyFunction<typeof EthT>(() => require("web3x/eth").Eth);
 */

export function lazyObject<T extends object>(objectCreator: () => T): T {
  let realTarget: T | undefined;

  // tslint:disable-next-line
  const dummyTarget = {} as T; // This is unsafe, but we never use dummyTarget.

  function getRealTarget(): T {
    if (realTarget === undefined) {
      const object = objectCreator();

      if (object instanceof Function) {
        throw new BuidlerError(
          ERRORS.GENERAL.UNSUPPORTED_OPERATION,
          "Creating lazy functions or classes with lazyObject"
        );
      }

      if (typeof object !== "object" || object === null) {
        throw new BuidlerError(
          ERRORS.GENERAL.UNSUPPORTED_OPERATION,
          "Using lazyObject with anything other than objects"
        );
      }

      if (!Object.isExtensible(object)) {
        Object.preventExtensions(dummyTarget);
      }

      realTarget = object;
    }

    return realTarget;
  }

  return new Proxy(dummyTarget, {
    defineProperty(target, property, descriptor) {
      return Reflect.defineProperty(getRealTarget(), property, descriptor);
    },

    deleteProperty(target, property) {
      return Reflect.deleteProperty(getRealTarget(), property);
    },

    get(target, property, receiver) {
      return Reflect.get(getRealTarget(), property, receiver);
    },

    getOwnPropertyDescriptor(target, property) {
      return Reflect.getOwnPropertyDescriptor(getRealTarget(), property);
    },

    getPrototypeOf(target) {
      return Reflect.getPrototypeOf(getRealTarget());
    },

    has(target, property) {
      return Reflect.has(getRealTarget(), property);
    },

    isExtensible(target) {
      return Reflect.isExtensible(getRealTarget());
    },

    ownKeys(target) {
      return Reflect.ownKeys(getRealTarget());
    },

    preventExtensions(target) {
      Object.preventExtensions(dummyTarget);
      return Reflect.preventExtensions(getRealTarget());
    },

    set(target, property, value, receiver) {
      return Reflect.set(getRealTarget(), property, value, receiver);
    },

    setPrototypeOf(target, prototype) {
      return Reflect.setPrototypeOf(getRealTarget(), prototype);
    }
  });
}

// tslint:disable-next-line ban-types
export function lazyFunction<T extends Function>(functionCreator: () => T): T {
  let realTarget: T | undefined;

  // tslint:disable-next-line
  const dummyTarget: T = function() {} as any; // This is unsafe, but we never use dummyTarget.

  function getRealTarget(): T {
    if (realTarget === undefined) {
      const object = functionCreator();

      if (!(object instanceof Function)) {
        throw new BuidlerError(
          ERRORS.GENERAL.UNSUPPORTED_OPERATION,
          "lazyFunction should be used for functions"
        );
      }

      if (!Object.isExtensible(object)) {
        Object.preventExtensions(dummyTarget);
      }

      realTarget = object;
    }

    return realTarget;
  }

  return new Proxy(dummyTarget, {
    defineProperty(target, property, descriptor) {
      return Reflect.defineProperty(getRealTarget(), property, descriptor);
    },

    deleteProperty(target, property) {
      return Reflect.deleteProperty(getRealTarget(), property);
    },

    get(target, property, receiver) {
      return Reflect.get(getRealTarget(), property, receiver);
    },

    getOwnPropertyDescriptor(target, property) {
      return Reflect.getOwnPropertyDescriptor(getRealTarget(), property);
    },

    getPrototypeOf(target) {
      return Reflect.getPrototypeOf(getRealTarget());
    },

    has(target, property) {
      return Reflect.has(getRealTarget(), property);
    },

    isExtensible(target) {
      return Reflect.isExtensible(getRealTarget());
    },

    ownKeys(target) {
      return Reflect.ownKeys(getRealTarget());
    },

    preventExtensions(target) {
      Object.preventExtensions(dummyTarget);
      return Reflect.preventExtensions(getRealTarget());
    },

    set(target, property, value, receiver) {
      return Reflect.set(getRealTarget(), property, value, receiver);
    },

    setPrototypeOf(target, prototype) {
      return Reflect.setPrototypeOf(getRealTarget(), prototype);
    },

    apply(target: T, thisArg: any, argArray?: any): any {
      return Reflect.apply(getRealTarget(), thisArg, argArray);
    },

    construct(target: T, argArray: any, newTarget?: any): object {
      return Reflect.construct(getRealTarget(), argArray);
    }
  });
}

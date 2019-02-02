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
  return createLazyProxy(
    objectCreator,
    () => ({}),
    object => {
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
    }
  );
}

// tslint:disable-next-line ban-types
export function lazyFunction<T extends Function>(functionCreator: () => T): T {
  return createLazyProxy(
    functionCreator,
    () => function() {},
    object => {
      if (!(object instanceof Function)) {
        throw new BuidlerError(
          ERRORS.GENERAL.UNSUPPORTED_OPERATION,
          "lazyFunction should be used for functions"
        );
      }
    }
  );
}

function createLazyProxy<ActualT extends GuardT, GuardT extends object>(
  targetCreator: () => ActualT,
  dummyTargetCreator: () => GuardT,
  validator: (target: any) => void
): ActualT {
  let realTarget: ActualT | undefined;

  // tslint:disable-next-line
  const dummyTarget: ActualT = dummyTargetCreator() as any;

  function getRealTarget(): ActualT {
    if (realTarget === undefined) {
      const target = targetCreator();

      validator(target);

      // We copy all properties. We won't use them, but help us avoid Proxy
      // invariant violations
      const properties = Object.getOwnPropertyNames(target);
      for (const property of properties) {
        const descriptor = Object.getOwnPropertyDescriptor(target, property)!;
        Object.defineProperty(dummyTarget, property, descriptor);
      }

      Object.setPrototypeOf(dummyTarget, Object.getPrototypeOf(target));

      if (!Object.isExtensible(target)) {
        Object.preventExtensions(dummyTarget);
      }

      realTarget = target;
    }

    return realTarget;
  }

  const handler: ProxyHandler<ActualT> = {
    defineProperty(target, property, descriptor) {
      Reflect.defineProperty(dummyTarget, property, descriptor);
      return Reflect.defineProperty(getRealTarget(), property, descriptor);
    },

    deleteProperty(target, property) {
      Reflect.deleteProperty(dummyTarget, property);
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
      Reflect.set(dummyTarget, property, value, receiver);
      return Reflect.set(getRealTarget(), property, value, receiver);
    },

    setPrototypeOf(target, prototype) {
      Reflect.setPrototypeOf(dummyTarget, prototype);
      return Reflect.setPrototypeOf(getRealTarget(), prototype);
    }
  };

  if (dummyTarget instanceof Function) {
    // If dummy target is a function, the actual target must be a function too.
    handler.apply = (target, thisArg: any, argArray?: any) => {
      // tslint:disable-next-line ban-types
      return Reflect.apply(getRealTarget() as Function, thisArg, argArray);
    };

    handler.construct = (target, argArray: any, newTarget?: any) => {
      // tslint:disable-next-line ban-types
      return Reflect.construct(getRealTarget() as Function, argArray);
    };
  }

  return new Proxy(dummyTarget, handler);
}

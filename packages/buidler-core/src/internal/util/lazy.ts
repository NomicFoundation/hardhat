import { BuidlerError } from "../core/errors";
import { ERRORS } from "../core/errors-list";

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
    (object) => {
      if (object instanceof Function) {
        throw new BuidlerError(ERRORS.GENERAL.UNSUPPORTED_OPERATION, {
          operation: "Creating lazy functions or classes with lazyObject",
        });
      }

      if (typeof object !== "object" || object === null) {
        throw new BuidlerError(ERRORS.GENERAL.UNSUPPORTED_OPERATION, {
          operation: "Using lazyObject with anything other than objects",
        });
      }
    }
  );
}

// tslint:disable-next-line ban-types
export function lazyFunction<T extends Function>(functionCreator: () => T): T {
  return createLazyProxy(
    // FIXME: this needs to be revised since TS >= 3.7.x fails without the cast
    functionCreator as () => any,
    () => function () {},
    (object) => {
      if (!(object instanceof Function)) {
        throw new BuidlerError(ERRORS.GENERAL.UNSUPPORTED_OPERATION, {
          operation:
            "Using lazyFunction with anything other than functions or classes",
        });
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

      // Using a null prototype seems to tirgger a V8 bug, so we forbid it
      // See: https://github.com/nodejs/node/issues/29730
      if (Object.getPrototypeOf(target) === null) {
        throw new BuidlerError(ERRORS.GENERAL.UNSUPPORTED_OPERATION, {
          operation:
            "Using lazyFunction or lazyObject to construct objects/functions with prototype null",
        });
      }

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
      // We have this short-circuit logic here to avoid a cyclic require when
      // loading Web3.js.
      //
      // If a lazy object is somehow accessed while its real target is being
      // created, it would trigger an endless loop of recreation, which node
      // detects and resolve to an empty object.
      //
      // This happens with Web3.js because we a lazyObject that loads it,
      // and expose it as `global.web3`. This Web3.js file accesses
      // `global.web3` when it's being loaded, triggering the loop we mentioned
      // before: https://github.com/ethereum/web3.js/blob/8574bd3bf11a2e9cf4bcf8850cab13e1db56653f/packages/web3-core-requestmanager/src/givenProvider.js#L41
      //
      // We just return `undefined` in that case, to not enter into the loop.
      const stack = new Error().stack;
      if (
        stack !== undefined &&
        stack.includes("givenProvider.js") &&
        realTarget === undefined
      ) {
        return undefined;
      }

      return Reflect.get(getRealTarget(), property, receiver);
    },

    getOwnPropertyDescriptor(target, property) {
      const descriptor = Reflect.getOwnPropertyDescriptor(
        getRealTarget(),
        property
      );

      if (descriptor !== undefined) {
        Object.defineProperty(dummyTarget, property, descriptor);
      }

      return descriptor;
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
    },
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

import { Eth } from "web3x/eth";

import { BuidlerError, ERRORS } from "../core/errors";

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

/**
 * This function is a lazy version of `require`. It imports a module
 * synchronously, by creating a proxy that delays the actual `require` until
 * the module is used.
 *
 * The disadvantage of using this technique is that the type information is
 * lost. If done with enough care, this can be manually fixed.
 *
 * TypeScript doesn't emit `require` calls for modules that are imported only
 * because of their types. So if one uses lazyImport along with a normal ESM
 * import you can pass the module's type to this function.
 *
 * An example of this can be:
 *
 *   `import func from "func-mod";`
 *   `const f = lazyImport<typeof func>("func-mod");`
 *
 * You can also pass it a selector to import just an element of the module:
 *
 *   `import { Eth } from "web3x/eth";`
 *   `const LazyEth = lazyImport<Eth>("web3x/eth", "Eth");`
 *
 * Limitations:
 *  - It's not entirely clear when to use `typeof`.
 *  - If you get a compilation error saying something about "namespace" consider
 *    using a selector.
 */
export function lazyImport<ModuleT = any>(
  packageName: string,
  selector?: string
): ModuleT {
  const importLazy = require("import-lazy");
  const lazyRequire = importLazy(require);
  const lazyModule = lazyRequire(packageName);

  if (selector === undefined) {
    return lazyModule;
  }

  return lazyObject(() => lazyModule[selector]);
}

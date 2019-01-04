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
          ERRORS.BUIDLER_UNSUPPORTED_OPERATION,
          "Creating lazy functions or classes with lazyObject"
        );
      }

      if (typeof object !== "object" || object === null) {
        throw new BuidlerError(
          ERRORS.BUIDLER_UNSUPPORTED_OPERATION,
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

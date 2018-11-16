"use strict";

export function lazyObject<T extends object>(objectCreator: () => T): T {
  let realTarget = undefined;
  const dummyTarget = {};

  function lazyInit() {
    if (realTarget === undefined) {
      const object = objectCreator();

      if (object instanceof Function) {
        throw new Error("lazyObject doesn't support functions nor classes");
      }

      if (typeof object !== "object" || object === null) {
        throw new Error(
          "objectCreator function given to lazyObject must return an object"
        );
      }

      if (!Object.isExtensible(object)) {
        Object.preventExtensions(dummyTarget);
      }

      realTarget = object;
    }
  }

  return new Proxy(dummyTarget as T, {
    defineProperty(target, property, descriptor) {
      lazyInit();

      return Reflect.defineProperty(realTarget, property, descriptor);
    },

    deleteProperty(target, property) {
      lazyInit();

      return Reflect.deleteProperty(realTarget, property);
    },

    get(target, property, receiver) {
      lazyInit();

      return Reflect.get(realTarget, property, receiver);
    },

    getOwnPropertyDescriptor(target, property) {
      lazyInit();

      return Reflect.getOwnPropertyDescriptor(realTarget, property);
    },

    getPrototypeOf(target) {
      lazyInit();

      return Reflect.getPrototypeOf(realTarget);
    },

    has(target, property) {
      lazyInit();

      return Reflect.has(realTarget, property);
    },

    isExtensible(target) {
      lazyInit();

      return Reflect.isExtensible(realTarget);
    },

    ownKeys(target) {
      lazyInit();

      return Reflect.ownKeys(realTarget);
    },

    preventExtensions(target) {
      lazyInit();

      Object.preventExtensions(dummyTarget);
      return Reflect.preventExtensions(realTarget);
    },

    set(target, property, value, receiver) {
      lazyInit();

      return Reflect.set(realTarget, property, value, receiver);
    },

    setPrototypeOf(target, prototype) {
      lazyInit();

      return Reflect.setPrototypeOf(realTarget, prototype);
    }
  });
}

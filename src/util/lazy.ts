export function lazyObject<T extends object>(objectCreator: () => T): T {
  let realTarget: T | undefined;

  // tslint:disable-next-line
  const dummyTarget = {} as T; // This is unsafe, but we never use dummyTarget.

  function getRealTarget(): T {
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

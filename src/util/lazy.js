"use strict";

function lazyObject(objectCreator) {
  let realTarget = undefined;

  function lazyInit() {
    if (realTarget === undefined) {
      realTarget = objectCreator();
    }
  }

  return new Proxy(
    {},
    {
      apply(target, thisArgument, argumentsList) {
        lazyInit();

        return Reflect.apply(realTarget, thisArgument, argumentsList);
      },

      construct(target, argumentsList, newTarget) {
        lazyInit();

        return Reflect.construct(realTarget, argumentsList, newTarget);
      },

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
    }
  );
}

module.exports = { lazyObject };

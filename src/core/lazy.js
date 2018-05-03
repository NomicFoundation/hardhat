function lazyObject(objectCreator) {
  return new Proxy(
    {},
    {
      realTarget: undefined,

      lazyInit() {
        if (this.realTarget === undefined) {
          this.realTarget = objectCreator();
        }
      },

      apply(target, thisArgument, argumentsList) {
        this.lazyInit();

        return Reflect.apply(this.realTarget, thisArgument, argumentsList);
      },

      construct(target, argumentsList, newTarget) {
        this.lazyInit();

        return Reflect.construct(this.realTarget, argumentsList, newTarget);
      },

      defineProperty(target, property, descriptor) {
        this.lazyInit();

        return Reflect.defineProperty(this.realTarget, property, descriptor);
      },

      deleteProperty(target, property) {
        this.lazyInit();

        return Reflect.deleteProperty(this.realTarget, property);
      },

      get(target, property, receiver) {
        this.lazyInit();

        return Reflect.get(this.realTarget, property, receiver);
      },

      getOwnPropertyDescriptor(target, property) {
        this.lazyInit();

        return Reflect.getOwnPropertyDescriptor(this.realTarget, property);
      },

      getPrototypeOf(target) {
        this.lazyInit();

        return Reflect.getPrototypeOf(this.realTarget);
      },

      has(target, property) {
        this.lazyInit();

        return Reflect.has(this.realTarget, property);
      },

      isExtensible(target) {
        this.lazyInit();

        return Reflect.isExtensible(this.realTarget);
      },

      ownKeys(target) {
        this.lazyInit();

        return Reflect.ownKeys(this.realTarget);
      },

      preventExtensions(target) {
        this.lazyInit();

        return Reflect.preventExtensions(this.realTarget);
      },

      set(target, property, value, receiver) {
        this.lazyInit();

        return Reflect.set(this.realTarget, property, value, receiver);
      },

      setPrototypeOf(target, prototype) {
        this.lazyInit();

        return Reflect.setPrototypeOf(this.realTarget, prototype);
      }
    }
  );
}

module.exports = { lazyObject };

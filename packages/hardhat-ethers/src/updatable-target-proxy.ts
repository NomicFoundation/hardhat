/**
 * Returns a read-only proxy that just forwards everything to a target,
 * and a function that can be used to change that underlying target
 */
export function createUpdatableTargetProxy<T extends object>(
  initialTarget: T
): {
  proxy: T;
  setTarget: (target: T) => void;
} {
  const targetObject = {
    target: initialTarget,
  };

  let isExtensible = Object.isExtensible(initialTarget);

  const handler: Required<ProxyHandler<T>> = {
    // these two functions are implemented because of the Required<ProxyHandler> type
    apply(_, thisArg, argArray) {
      throw new Error(
        "cannot be implemented because the target is not a function"
      );
    },

    construct(_, argArray, newTarget) {
      throw new Error(
        "cannot be implemented because the target is not a function"
      );
    },

    defineProperty(_, property, descriptor) {
      throw new Error(
        `cannot define property ${String(property)} in read-only proxy`
      );
    },

    deleteProperty(_, property) {
      throw new Error(
        `cannot delete property ${String(property)} in read-only proxy`
      );
    },

    enumerate(_) {
      return [...Reflect.enumerate(targetObject.target)];
    },

    get(_, property, receiver) {
      const result = Reflect.get(targetObject.target, property, receiver);

      if (result instanceof Function) {
        return result.bind(targetObject.target);
      }

      return result;
    },

    getOwnPropertyDescriptor(_, property) {
      const descriptor = Reflect.getOwnPropertyDescriptor(
        targetObject.target,
        property
      );

      if (descriptor !== undefined) {
        Object.defineProperty(targetObject.target, property, descriptor);
      }

      return descriptor;
    },

    getPrototypeOf(_) {
      return Reflect.getPrototypeOf(targetObject.target);
    },

    has(_, property) {
      return Reflect.has(targetObject.target, property);
    },

    isExtensible(_) {
      // we need to return the extensibility value of the original target
      return isExtensible;
    },

    ownKeys(_) {
      return Reflect.ownKeys(targetObject.target);
    },

    preventExtensions(_) {
      isExtensible = false;
      return Reflect.preventExtensions(targetObject.target);
    },

    set(_, property, value, receiver) {
      throw new Error(
        `cannot set property ${String(property)} in read-only proxy`
      );
    },

    setPrototypeOf(_, prototype) {
      throw new Error("cannot change the prototype in read-only proxy");
    },
  };

  const proxy: T = new Proxy(initialTarget, handler);

  const setTarget = (newTarget: T) => {
    targetObject.target = newTarget;
  };

  return { proxy, setTarget };
}

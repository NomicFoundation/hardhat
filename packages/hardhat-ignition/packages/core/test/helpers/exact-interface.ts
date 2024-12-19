/* eslint-disable import/no-unused-modules */
export type ForbiddenExcessProperties<K extends keyof any> = {
  [P in K]: never;
};

// This is a helper that can be used to test that a class implements an interface
// and doesn't expose any extra public property.
// It's used like this:
//   const implementation: ExactInterface<Interface, Implementation> = new Implementation();
// If the interface is not implemented, or extra properties are exposed, it will result in a
// type error.
export type ExactInterface<
  InterfaceT,
  ImplementationT extends InterfaceT
> = ImplementationT &
  ForbiddenExcessProperties<Exclude<keyof ImplementationT, keyof InterfaceT>>;

/**
 * All the parameters except the first one.
 */
export type ParametersExceptFirst<T> = T extends (
  ...args: [any, ...infer P]
) => any
  ? P
  : never;

/**
 * All the parameters of a function, except the last one.
 */
export type ParametersExceptLast<T> = T extends (
  ...args: [...infer P, any]
) => any
  ? P
  : never;

/**
 * All the parameters of a function, except the first and last ones.
 */
export type ParametersExceptFirstAndLast<T> = T extends (
  ...args: [any, ...infer P, any]
) => any
  ? P
  : never;

/**
 * The last parameter of a function.
 */
export type LastParameter<T> = T extends (
  ...args: [...infer _P, infer Last]
) => any
  ? Last
  : never;

/**
 * The parameters of a function.
 */
export type Params<T> = T extends (...args: infer P) => any ? P : never;

/**
 * The return type of a function.
 */
export type Return<T> = T extends (...args: any[]) => infer Ret ? Ret : never;

/**
 * The same type as T, but with the specified keys required.
 */
export type RequireField<T, K extends keyof T> = T & {
  [P in K]-?: T[P];
};

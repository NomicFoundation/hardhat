/**
 * This function is a typed version of `Object.keys`. Note that it's type
 * unsafe. You have to be sure that `o` has exactly the same keys as `T`.
 */
export const unsafeObjectKeys = Object.keys as <T>(
  o: T
) => Array<Extract<keyof T, string>>;

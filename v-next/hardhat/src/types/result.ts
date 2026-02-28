/**
 * A result that can either have a value or an error.
 */
export type Result<ValueT, ErrorT> =
  | { readonly success: true; readonly value: ValueT }
  | { readonly success: false; readonly error: ErrorT };

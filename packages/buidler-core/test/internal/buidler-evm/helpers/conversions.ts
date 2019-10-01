/**
 * Transforms a QUANTITY to a number. It should only be used if you are 100% sure that the value
 * fits in a number.
 */
export function quantityToNumber(quantity: string): number {
  return parseInt(quantity.substring(2), 16);
}

/**
 * Given an object generate the type that is an array of the strings
 * of the objects properties.
 *
 * @example
 * type ExpectedConfigOptions = keyListOf<DeployConfig>
 * Where ExpectedConfigOptions is the type level tuple:
 * ```
 * [
 *    "blockPollingInterval",
 *    "maxFeeBumps",
 *    "requiredConfirmations",
 *    "timeBeforeBumpingFees"
 * ]
 * ```
 */
export type KeyListOf<T extends object> = ConvertObjectToTypeArray<
  ConvertUnionToObject<Extract<keyof T, string>>
>;

type ConvertUnionToObject<U extends string> = {
  [key in U]: ConvertUnionToObject<Exclude<U, key>>;
};

type ConvertObjectToTypeArray<O extends { [key: string]: any }> = {} extends O
  ? []
  : {
      [key in keyof O]: [key, ...ConvertObjectToTypeArray<O[key]>];
    }[keyof O];

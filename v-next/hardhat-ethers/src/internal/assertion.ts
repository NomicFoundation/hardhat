import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

export function assertCanConvertToBigInt(
  value: any,
  variableName: string,
): asserts value is bigint | string | number {
  assertHardhatInvariant(
    typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "bigint" ||
      typeof value === "boolean",
    `Variable "${variableName}" should be a string, number, bigint or boolean`,
  );
}

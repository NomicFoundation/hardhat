import { BN } from "ethereumjs-util";

/**
 * This function turns a wei value in a human readable string. It shows values
 * in ETH, gwei or wei, depending on how large it is.
 *
 * It never show more than 99999 wei or gwei, moving to the larger denominator
 * when necessary.
 *
 * It never shows more than 4 decimal digits. Adapting denominator and
 * truncating as necessary.
 */
export function weiToHumanReadableString(wei: BN | number): string {
  if (typeof wei === "number") {
    wei = new BN(wei);
  }

  if (wei.eqn(0)) {
    return "0 ETH";
  }

  if (wei.lt(new BN(10).pow(new BN(5)))) {
    return `${wei.toString()} wei`;
  }

  if (wei.lt(new BN(10).pow(new BN(14)))) {
    return `${toDecimalString(wei, 9, 4)} gwei`;
  }

  return `${toDecimalString(wei, 18, 4)} ETH`;
}

function toDecimalString(
  value: BN,
  digitsToInteger: number,
  decimalDigits: number = 4
): string {
  const oneUnit = new BN(10).pow(new BN(digitsToInteger));
  const oneDecimal = new BN(10).pow(new BN(digitsToInteger - decimalDigits));

  const integer = value.div(oneUnit);

  const decimals = value.mod(oneUnit).div(oneDecimal);
  if (decimals.eqn(0)) {
    return integer.toString(10);
  }

  const decimalsString = removeRightZeros(
    decimals.toString(10).padStart(decimalDigits, "0")
  );

  return `${integer.toString(10)}.${decimalsString}`;
}

function removeRightZeros(str: string): string {
  let zeros = 0;

  for (let i = str.length - 1; i >= 0; i--) {
    if (str.charAt(i) !== "0") {
      break;
    }

    zeros += 1;
  }

  return str.substr(0, str.length - zeros);
}

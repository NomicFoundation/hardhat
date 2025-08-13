// TODO: Move BigFloat to hardhat-utils if needed
export class BigFloat {
  readonly #mantissa: bigint;
  readonly #exponent: number;

  constructor(mantissa: bigint, exponent: number) {
    // Remove trailing trailing zeros
    while (mantissa % 10n === 0n && mantissa !== 0n) {
      mantissa /= 10n;
      exponent++;
    }
    this.#mantissa = mantissa;
    this.#exponent = exponent;
  }

  public static fromString(str: string): BigFloat {
    let sign = 1n;
    if (str.startsWith("-")) {
      sign = -1n;
      str = str.slice(1);
    } else if (str.startsWith("+")) {
      str = str.slice(1);
    }

    if (!str.includes(".")) {
      return new BigFloat(BigInt(str) * sign, 0);
    }

    const [integral, fractional] = str.split(".");
    return new BigFloat(
      BigInt(`${integral}${fractional}`) * sign,
      -fractional.length,
    );
  }

  public static fromNumber(num: number): BigFloat {
    return BigFloat.fromString(num.toString());
  }

  public static fromBigInt(num: bigint): BigFloat {
    return new BigFloat(num, 0);
  }

  public abs(): BigFloat {
    return new BigFloat(
      this.#mantissa < 0n ? -this.#mantissa : this.#mantissa,
      this.#exponent,
    );
  }

  public add(other: BigFloat): BigFloat {
    const exp = Math.min(this.#exponent, other.#exponent);
    const m1 = this.#mantissa * 10n ** BigInt(this.#exponent - exp);
    const m2 = other.#mantissa * 10n ** BigInt(other.#exponent - exp);
    return new BigFloat(m1 + m2, exp);
  }

  public sub(other: BigFloat): BigFloat {
    const exp = Math.min(this.#exponent, other.#exponent);
    const m1 = this.#mantissa * 10n ** BigInt(this.#exponent - exp);
    const m2 = other.#mantissa * 10n ** BigInt(other.#exponent - exp);
    return new BigFloat(m1 - m2, exp);
  }

  public mul(other: BigFloat): BigFloat {
    return new BigFloat(
      this.#mantissa * other.#mantissa,
      this.#exponent + other.#exponent,
    );
  }

  public div(other: BigFloat, precision: number = 18): BigFloat {
    // Scale numerator for desired precision
    const scaledMantissa = this.#mantissa * 10n ** BigInt(precision);
    return new BigFloat(
      scaledMantissa / other.#mantissa,
      this.#exponent - other.#exponent - precision,
    );
  }

  public toString(signed = false): string {
    const mantissa = this.#mantissa;
    const exponent = this.#exponent;

    const isNegative = this.#mantissa < 0n;
    const isPositive = this.#mantissa > 0n;
    const signChar = signed
      ? isNegative
        ? "-"
        : isPositive
          ? "+"
          : ""
      : isNegative
        ? "-"
        : "";

    const absMantissa = isNegative ? -mantissa : mantissa;

    if (exponent >= 0) {
      const scaledMantissa = absMantissa * 10n ** BigInt(exponent);
      return `${signChar}${scaledMantissa}`;
    }

    const scale = 10n ** BigInt(-exponent);
    const integral = absMantissa / scale;
    const fractional = absMantissa % scale;

    if (fractional === 0n) {
      return `${signChar}${integral}`;
    }

    const fractionalStr = fractional.toString().padStart(-exponent, "0");
    return `${signChar}${integral}.${fractionalStr}`;
  }

  public toFixed(fractionalDigits: number, signed = false): string {
    let mantissa = this.#mantissa;
    let exponent = this.#exponent;

    const isNegative = this.#mantissa < 0n;
    const isPositive = this.#mantissa > 0n;
    const signChar = signed
      ? isNegative
        ? "-"
        : isPositive
          ? "+"
          : ""
      : isNegative
        ? "-"
        : "";

    if (-exponent > fractionalDigits) {
      const factor = 10n ** BigInt(-exponent - fractionalDigits);
      if (isNegative) {
        mantissa = (mantissa - factor / 2n) / factor;
      } else {
        mantissa = (mantissa + factor / 2n) / factor;
      }
      exponent = -fractionalDigits;
    }

    const absMantissa = isNegative ? -mantissa : mantissa;

    if (exponent >= 0) {
      const scaledMantissa = absMantissa * 10n ** BigInt(exponent);
      if (fractionalDigits === 0) {
        return `${signChar}${scaledMantissa}`;
      }
      return `${signChar}${scaledMantissa}.${"0".repeat(fractionalDigits)}`;
    }

    const scale = 10n ** BigInt(-exponent);
    const integral = absMantissa / scale;
    const fractional = absMantissa % scale;

    if (fractional === 0n) {
      if (fractionalDigits === 0) {
        return `${signChar}${integral}`;
      } else {
        return `${signChar}${integral}.${"0".repeat(fractionalDigits)}`;
      }
    }

    const fractionalStr = fractional
      .toString()
      .padStart(-exponent, "0")
      .padEnd(fractionalDigits, "0");
    return `${signChar}${integral}.${fractionalStr}`;
  }

  #align(other: BigFloat): [bigint, bigint] {
    const exponent = Math.min(this.#exponent, other.#exponent);

    const m1 = this.#mantissa * 10n ** BigInt(this.#exponent - exponent);
    const m2 = other.#mantissa * 10n ** BigInt(other.#exponent - exponent);

    return [m1, m2];
  }

  public greaterThan(other: BigFloat): boolean {
    const [m1, m2] = this.#align(other);
    return m1 > m2;
  }

  public lessThan(other: BigFloat): boolean {
    const [m1, m2] = this.#align(other);
    return m1 < m2;
  }

  public equals(other: BigFloat): boolean {
    const [m1, m2] = this.#align(other);
    return m1 === m2;
  }

  public greaterThanOrEqual(other: BigFloat): boolean {
    const [m1, m2] = this.#align(other);
    return m1 >= m2;
  }

  public lessThanOrEqual(other: BigFloat): boolean {
    const [m1, m2] = this.#align(other);
    return m1 <= m2;
  }
}

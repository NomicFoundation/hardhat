// eslint-disable-next-line @typescript-eslint/no-namespace, @typescript-eslint/no-unused-vars
declare namespace Chai {
  interface NumericComparison {
    within(start: any, finish: any, message?: string): Assertion;
  }

  interface NumberComparer {
    // eslint-disable-next-line
    (value: any, message?: string): Assertion;
  }

  interface CloseTo {
    // eslint-disable-next-line
    (expected: any, delta: any, message?: string): Assertion;
  }

  interface Length extends Assertion {
    // eslint-disable-next-line
    (length: any, message?: string): Assertion;
  }
}

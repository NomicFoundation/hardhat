declare namespace Chai {
  interface Assertion
    extends LanguageChains,
      NumericComparison,
      TypeComparison {
    // TODO: is additional meant to be here?
    emit(contract: any, eventName: string, additional?: number): EmitAssertion;
    // TODO: this needs a refined type
    reverted(ethers: any): AsyncAssertion;
    // TODO: check that number is meant here
    revertedWith(reason: string | RegExp | number): AsyncAssertion;
    // TODO: refine this type
    revertedWithoutReason(ethers: any): AsyncAssertion;
    revertedWithPanic(code?: any): AsyncAssertion;
    // TODO: is extraArgument meant to be here? Is contract really optional?
    revertedWithCustomError(
      contract?: { interface: any } | string,
      customErrorName?: string,
      extraArgument?: string,
    ): CustomErrorAssertion;
    hexEqual(other: string): void;
    properPrivateKey: void;
    properAddress: void;
    properHex(length: number): void;
    // TODO: give provider proper type
    changeEtherBalance(
      provider: any,
      account: any,
      balance: any,
      options?: any,
    ): AsyncAssertion;
    // TODO: give provider proper type
    changeEtherBalances(
      provider: any,
      accounts: any[],
      balances: any[] | ((changes: bigint[]) => boolean),
      options?: any,
    ): AsyncAssertion;
    changeTokenBalance(
      provider: any,
      token: any,
      account: any,
      balance?: any,
    ): AsyncAssertion;
    // TODO: is balance optional?
    changeTokenBalances(
      provider: any,
      token: any,
      account: any[],
      balance?: any[] | ((changes: bigint[]) => boolean),
    ): AsyncAssertion;
  }

  interface NumericComparison {
    within(start: any, finish: any, message?: string): Assertion;
  }

  interface NumberComparer {
    // eslint-disable-next-line -- the interface must follow the original definition pattern
    (value: any, message?: string): Assertion;
  }

  interface CloseTo {
    // eslint-disable-next-line -- the interface must follow the original definition pattern
    (expected: any, delta: any, message?: string): Assertion;
  }

  interface Length extends Assertion {
    // eslint-disable-next-line -- the interface must follow the original definition pattern
    (length: any, message?: string): Assertion;
  }

  interface AsyncAssertion extends Assertion, Promise<void> {}

  interface EmitAssertion extends AsyncAssertion {
    withArgs(...args: any[]): AsyncAssertion;
  }

  interface CustomErrorAssertion extends AsyncAssertion {
    withArgs(...args: any[]): AsyncAssertion;
  }
}

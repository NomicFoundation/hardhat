// eslint-disable-next-line @typescript-eslint/no-namespace, @typescript-eslint/no-unused-vars
declare namespace Chai {
  interface Assertion
    extends LanguageChains,
      NumericComparison,
      TypeComparison {
    nonChainableMatcher(): Assertion;
  }
}

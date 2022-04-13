export function supportReverted(Assertion: Chai.AssertionStatic) {
  Assertion.addProperty("reverted", function (this: any) {
    const promise = this._obj;

    const onSuccess = (_value: any) => {
      this.assert(
        false,
        `Expected transaction to be reverted`,
        `Expected transaction NOT to be reverted`,
        "Transaction reverted.",
        "Transaction NOT reverted."
      );
    };

    const onError = (error: any) => {
      this.assert(
        true,
        `Expected transaction to be reverted`,
        `Expected transaction NOT to be reverted`,
        "Transaction reverted.",
        error
      );
    };

    const derivedPromise = promise.then(onSuccess, onError);

    this.then = derivedPromise.then.bind(derivedPromise);
    this.catch = derivedPromise.catch.bind(derivedPromise);
    return this;
  });
}

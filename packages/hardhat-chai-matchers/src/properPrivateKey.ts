export function supportProperPrivateKey(Assertion: Chai.AssertionStatic) {
  Assertion.addProperty("properPrivateKey", function (this: any) {
    const subject = this._obj;
    this.assert(
      /^0x[0-9-a-fA-F]{64}$/.test(subject),
      `Expected "${subject}" to be a proper private key`,
      `Expected "${subject}" not to be a proper private key`,
      "proper private key (eg.: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)",
      subject
    );
  });
}

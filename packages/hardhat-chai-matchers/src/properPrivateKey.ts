export function supportProperPrivateKey(Assertion: Chai.AssertionStatic) {
  Assertion.addProperty("properPrivateKey", function (this: any) {
    const subject = this._obj;
    this.assert(
      /^0x[0-9-a-fA-F]{64}$/.test(subject),
      `Expected "${subject}" to be a proper private key`,
      `Expected "${subject}" not to be a proper private key`,
      "proper address (eg.: 0x1234567890123456789012345678901234567890)",
      subject
    );
  });
}

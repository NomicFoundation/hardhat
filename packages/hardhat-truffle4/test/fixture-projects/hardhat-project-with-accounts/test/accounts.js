contract("A contract", function (accounts) {
  it("Should derive the right accounts", function () {
    assert.deepEqual(accounts, [
      "0x27B8b55314792629B75957F016861a22d725398F",
      "0x33440c83b7293031B5e728539B922773013c9A7d",
    ]);
  });
});

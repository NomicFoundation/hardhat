const Greeter = artifacts.require("Greeter");

describe("Greeter contract", () => {
  it("Should return the right greeting", async () => {
    const expectedGreeting = "Hello, buidler!";

    const greeter = await Greeter.new();
    const actualGreeting = await greeter.greet();

    assert.equal(actualGreeting, expectedGreeting);
  });
});

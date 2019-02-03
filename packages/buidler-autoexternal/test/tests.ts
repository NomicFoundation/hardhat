import { BuidlerRuntimeEnvironment } from "@nomiclabs/buidler/types";
import { assert } from "chai";

import { ExampleBuidlerRuntimeEnvironmentField } from "../src/index";

declare module "mocha" {
  interface Context {
    env: BuidlerRuntimeEnvironment;
  }
}

describe("BuidlerRuntimeEnvironment extension", function() {
  beforeEach("Buidler project setup", function() {
    process.chdir(__dirname + "/buidler-project");
    process.env.BUIDLER_NETWORK = "develop";

    // We first clear any cache
    delete require.cache[require.resolve("@nomiclabs/buidler")];

    this.env = require("@nomiclabs/buidler");
  });

  it("It should add the example field", function() {
    assert.instanceOf(this.env.example, ExampleBuidlerRuntimeEnvironmentField);
  });

  it("The example filed should say hello", function() {
    assert.equal(this.env.example.sayHello(), "hello");
  });
});

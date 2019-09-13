import { assert } from "chai";
import path from "path";

import { GanacheService } from "../src/ganache-service";

import { useEnvironment } from "./helpers";

describe("Ganache plugin with empty configs", function() {
  useEnvironment(path.join(__dirname, "buidler-project"));

  it("Should set ganache as default network", function() {
    assert.equal(this.env.config.defaultNetwork, "ganache");
  });

  it("Should add ganache network to buidler runtime environment", function() {
    assert.isDefined(this.env.config.networks.ganache);
  });

  it("Should expose ganache defaults condfigs in buidler runtime environment", function() {
    assert.isDefined(this.env.config.networks.ganache);
    const defaultOptions = GanacheService.getDefaultOptions() as any;
    const options = this.env.config.networks.ganache as any;

    // Iterate over all default options and assert equality
    for (const [key, value] of Object.entries(defaultOptions)) {
      assert.equal(options[key], value);
    }
  });

  it("Should run Buidler TEST task using Ganache", async function() {
    const accounts = await this.env.ethereum.send("eth_accounts");

    console.log("\n");
    console.log("\n");
    console.log(accounts);
  });

  // it("Should run Buidler RUN task using ganache", async function() {
  //   await this.env.run(TASK_RUN);
  // });
});

// describe("Ganache plugin with custom configs", function() {
//   useEnvironment(path.join(__dirname, "buidler-project-with-configs"));
//
//   it("Should set ganache as default network", function() {
//     assert.equal(this.env.config.defaultNetwork, "ganache");
//   });
//
//   it("Should add ganache network to buidler runtime environment", function() {
//     assert.isDefined(this.env.config.networks.ganache);
//   });
//
//   it("Should expose ganache custom condfigs in buidler runtime environment", function() {
//     assert.isDefined(this.env.config.networks.ganache);
//     const defaultOptions = GanacheService.getDefaultOptions() as any;
//     const options = this.env.config.networks.ganache as any;
//
//     // Iterate over all default options and assert equality
//     for (const [key, value] of Object.entries(defaultOptions)) {
//       assert.equal(options[key], value);
//     }
//   });
// });

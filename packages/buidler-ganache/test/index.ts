import { assert } from "chai";
import path from "path";

import { GanacheService } from "../src/ganache-service";

import { useEnvironment } from "./helpers";

describe("Ganache plugin with empty configs", function() {
  useEnvironment(path.join(__dirname, "buidler-project"));

  it("Should add ganache network to the config", function() {
    assert.isDefined(this.env.config.networks.ganache);
  });

  it("Should expose ganache defaults configs in buidler's config", function() {
    assert.isDefined(this.env.config.networks.ganache);
    const defaultOptions = GanacheService.getDefaultOptions() as any;
    const options = this.env.config.networks.ganache as any;

    // Iterate over all default options and assert equality
    for (const [key, value] of Object.entries(defaultOptions)) {
      assert.equal(options[key], value);
    }
  });

  it("Should run Buidler TEST task using Ganache", async function() {
    await this.env.run("test", { noCompile: true, testFiles: [] });
  });

  it("Should run Buidler RUN task 'accounts-sample.js' using Ganache", async function() {
    await this.env.run("run", {
      noCompile: true,
      script: "scripts/accounts-sample.js"
    });

    assert.equal(process.exitCode, 0);
  });

  it("Should run Buidler RUN task 'delayed-sample.js' using Ganache", async function() {
    await this.env.run("run", {
      noCompile: true,
      script: "scripts/delayed-sample.js"
    });

    assert.equal(process.exitCode, 0);
  });
});

describe("Ganache plugin with custom configs", function() {
  useEnvironment(path.join(__dirname, "buidler-project-with-configs"));

  it("Should add ganache network to buidler's config", function() {
    assert.isDefined(this.env.config.networks.ganache);
  });

  it("Should load custom configs in buidler's config'", function() {
    assert.isDefined(this.env.config.networks.ganache);
    const customConfigs = require("./buidler-project-with-configs/buidler.config.js");

    assert.isDefined(customConfigs.networks.ganache);
    const customOptions = customConfigs.networks.ganache;

    const options = this.env.config.networks.ganache as any;

    // Iterate over all custom options and assert equality
    for (const [key, value] of Object.entries(customOptions)) {
      assert.equal(options[key], value);
    }
  });

  it("Should expose merged (custom + defaults) configs in buidler's config", function() {
    assert.isDefined(this.env.config.networks.ganache);
    const customConfigs = require("./buidler-project-with-configs/buidler.config.js");
    const defaultOptions = GanacheService.getDefaultOptions() as any;

    assert.isDefined(customConfigs.networks.ganache);
    const customOptions = customConfigs.networks.ganache;
    const mergedOptions = { ...defaultOptions, ...customOptions };

    const options = this.env.config.networks.ganache as any;

    // Iterate over all custom options and assert equality
    for (const [key, value] of Object.entries(mergedOptions)) {
      assert.equal(options[key], value);
    }
  });

  it("Should run Buidler RUN task using Ganache with custom configs", async function() {
    await this.env.run("run", {
      noCompile: true,
      script: "scripts/custom-accounts-sample.js"
    });

    assert.equal(process.exitCode, 0);
  });
});

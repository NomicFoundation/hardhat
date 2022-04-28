import { fork } from "child_process";
import getPort from "get-port";
import { resetHardhatContext } from "hardhat/plugins-testing";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import path from "path";

// we assume that all the fixture projects use the hardhat-ethers plugin
import "@nomiclabs/hardhat-ethers/internal/type-extensions";

declare module "mocha" {
  interface Context {
    hre: HardhatRuntimeEnvironment;
  }
}

/**
 * Starts a HRE with the in-process hardhat network.
 */
export function useEnvironment(fixtureProjectName: string) {
  beforeEach("start hardhat in-process", async function () {
    process.chdir(
      path.resolve(__dirname, "fixture-projects", fixtureProjectName)
    );

    process.env.HARDHAT_NETWORK = "hardhat";

    this.hre = require("hardhat");
    await this.hre.run("compile", { quiet: true });
  });

  afterEach(async function () {
    resetHardhatContext();
    delete process.env.HARDHAT_NETWORK;
  });
}

/**
 * Start a Hardhat node in a separate process, and then in this process starts a
 * HRE connected via http to that node.
 */
export function useEnvironmentWithNode(fixtureProjectName: string) {
  const fixtureProjectDir = path.resolve(
    __dirname,
    "fixture-projects",
    fixtureProjectName
  );

  // we start a shared node in a `before` hook to make tests run faster
  before("start a hardhat node", async function () {
    process.chdir(fixtureProjectDir);

    // this env var will be used both by the script that starts the hh node and
    // by the configuration of the 'localhost' network in the fixture project
    process.env.HARDHAT_NODE_PORT = String(await getPort());

    this.hhNodeProcess = fork(
      path.resolve(fixtureProjectDir, "start-node.js"),
      {
        cwd: fixtureProjectDir,
        // pipe stdout so we can check when the node it's ready
        stdio: "pipe",
      }
    );

    // start hardhat connected to the node
    process.env.HARDHAT_NETWORK = "localhost";

    this.hre = require("hardhat");
    await this.hre.run("compile", { quiet: true });

    // wait until the node is ready
    return new Promise((resolve) => {
      this.hhNodeProcess.stdout.on("data", (data: any) => {
        const nodeStarted = data
          .toString()
          .includes("Started HTTP and WebSocket JSON-RPC server at");
        if (nodeStarted) {
          resolve();
        }
      });
    });
  });

  after(async function () {
    resetHardhatContext();

    delete process.env.HARDHAT_NETWORK;
    delete process.env.HARDHAT_NODE_PORT;

    this.hhNodeProcess.kill();
    return new Promise((resolve) => {
      this.hhNodeProcess.on("exit", resolve);
    });
  });
}

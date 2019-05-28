import { assert } from "chai";
import net from "net";
import portScanner from "portscanner";

import { GanacheWrapper } from "../src/ganache-wrapper";

const FIRST_NOT_PRIVILEDGED_PORT = 1024;
const MAX_PORT_NUMBER = 65535;

describe("Ganache Wrapper", async function() {
  describe("isRunning", async function() {
    it("should return false if port is closed", async function() {
      const unusedPort = await portScanner.findAPortNotInUse(
        FIRST_NOT_PRIVILEDGED_PORT,
        MAX_PORT_NUMBER
      );

      const ganacheWrapper = new GanacheWrapper(
        `http://127.0.0.1:${unusedPort}`
      );
      const isRunning = await ganacheWrapper.isRunning();

      assert.isFalse(isRunning);
    });

    it("should return true if port is open", async function() {
      const portForMockServer = await portScanner.findAPortNotInUse(
        FIRST_NOT_PRIVILEDGED_PORT,
        MAX_PORT_NUMBER
      );

      const server = net.createServer().listen(portForMockServer);

      const ganacheWrapper = new GanacheWrapper(
        `http://127.0.0.1:${portForMockServer}`
      );
      const isRunning = await ganacheWrapper.isRunning();

      server.close();

      assert.isTrue(isRunning);
    });
  });

  describe("start", async function() {
    it("should start the server if the port is not open ", async function() {
      const ganacheWrapper = new GanacheWrapper(`http://127.0.0.1:8545`);

      ganacheWrapper.start();

      const portStatus = await portScanner.checkPortStatus(8545, "127.0.0.1");
      assert.strictEqual(portStatus, "open");

      ganacheWrapper.stop();
    });
  });

  describe("stop", async function() {
    it("should stop the running server", async function() {
      const ganacheWrapper = new GanacheWrapper(`http://127.0.0.1:8545`);

      ganacheWrapper.start();

      let portStatus = await portScanner.checkPortStatus(8545, "127.0.0.1");
      assert.strictEqual(portStatus, "open");

      ganacheWrapper.stop();

      portStatus = await portScanner.checkPortStatus(8545, "127.0.0.1");
      assert.strictEqual(portStatus, "closed");
    });
  });
});

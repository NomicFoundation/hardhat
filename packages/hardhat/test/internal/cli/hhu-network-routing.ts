import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import {
  captureConsole,
  useFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";

import { JsonRpcServerImplementation } from "../../../src/internal/builtin-plugins/node/json-rpc/server.js";
import { main } from "../../../src/internal/cli/hhu.js";
import { resetGlobalHardhatRuntimeEnvironment } from "../../../src/internal/global-hre-instance.js";
import { MockEthereumProvider } from "../../utils.js";

// This test lives in its own file on purpose. The `hhu` binary resolves the
// network through Hardhat's global HRE, which `src/index.ts` creates once per
// process (a top-level await captured in a `const`). Sharing a process with
// another network-using hhu test would pin that HRE to a different network
// first, so `--network` routing here would silently never take effect.
describe("hhu --network routing", () => {
  const KNOWN_BLOCK_NUMBER = 1234;

  useFixtureProject("cli/parsing/hhu-http-network");

  const capture = captureConsole();

  let server: JsonRpcServerImplementation;

  before(async () => {
    // A mock node that only answers `eth_blockNumber` with a known value, so a
    // matching output proves the request reached *this* network.
    const provider = new MockEthereumProvider({
      eth_blockNumber: numberToHexString(KNOWN_BLOCK_NUMBER),
    });

    server = new JsonRpcServerImplementation({
      hostname: "127.0.0.1",
      port: 0,
      provider,
    });

    const { address, port } = await server.listen();
    // The fixture's `mockRpc` http network reads this to know where to connect.
    process.env.HHU_TEST_RPC_URL = `http://${address}:${port}`;
  });

  after(async () => {
    await server.close();
    // `network.create` creates the global HRE and `--network` sets the env var;
    // reset both so they don't leak into other tests.
    resetGlobalHardhatRuntimeEnvironment();
    delete process.env.HHU_TEST_RPC_URL;
    delete process.env.HARDHAT_NETWORK;
  });

  it("routes to the network named by --network", async () => {
    await main(["--network", "mockRpc", "fetch", "block-number"], {
      rethrowErrors: true,
    });

    assert.deepEqual(capture.lines, [String(KNOWN_BLOCK_NUMBER)]);
  });
});

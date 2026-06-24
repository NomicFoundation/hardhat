import type { HardhatUserConfig } from "../../../../../src/config.js";

// An `http` network whose URL is injected by the test once its mock JSON-RPC
// server is listening (the port is random). Used to prove that `hhu --network`
// routes to the named network end-to-end.
const config: HardhatUserConfig = {
  networks: {
    mockRpc: {
      type: "http",
      url: process.env.HHU_TEST_RPC_URL ?? "",
    },
  },
};

export default config;

import type { HardhatUserConfig } from "../src/types/config.js";
import { configVariable } from "../src/config.js";
import hardhatFoo from "./example-plugins/hardhat-foo/index.js";

export default {
  plugins: [hardhatFoo],
  solidity: "0.8.22",
  foo: {
    bar: 12,
  },
  privateKey: configVariable("PRIVATE_KEY"),
} satisfies HardhatUserConfig;

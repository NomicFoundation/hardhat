import HardhatMochaPlugin from "../../../src/index.js";

const config = {
  plugins: [HardhatMochaPlugin],
  mocha: {
    delay: 123,
  },
};

export default config;

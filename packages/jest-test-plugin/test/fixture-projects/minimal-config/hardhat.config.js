module.exports = {
  solidity: "0.8.3",
  test: {
    modulePath: `${__dirname}/../../../src/index.ts`,
    config: {
      silent: true, // Avoid console log pollution: the test will not output to the console,
      verbose: false,
      reporters: [
        "/home/chris/repos/NomicFoundation/hardhat5/packages/jest-test-plugin/test/fixture-projects/minimal-config/custom-reporter.js",
      ],
    },
  },
};

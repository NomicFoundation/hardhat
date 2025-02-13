const path = require("path");

/**
 * This config allows to specify custom redirects. In order to place a new one, add an object with the following keys:
 * {
 *   source: "/sourcePath/:sourceSlug",
     destination: "/destPath/:sourceSlug",
     permanent: true/false,
 * }
 *
 * (:sourceSlug is optional)
 *
 * Read more about NextJS redirects https://nextjs.org/docs/api-reference/next.config.js/redirects
 *
 */
const customRedirects = [
  // shortlinks
  {
    source: "/config",
    destination: "/hardhat-runner/docs/config",
    permanent: false,
  },
  {
    source: "/plugins",
    destination: "/hardhat-runner/plugins",
    permanent: false,
  },
  {
    source: "/getting-started",
    destination: "/hardhat-runner/docs/getting-started#overview",
    permanent: false,
  },
  { source: "/links/stack-traces", destination: "/", permanent: false },
  {
    source: "/reportbug",
    destination: "https://github.com/NomicFoundation/hardhat/issues/new",
    permanent: false,
  },
  {
    source: "/report-bug",
    destination: "https://github.com/NomicFoundation/hardhat/issues/new",
    permanent: false,
  },
  {
    source: "/console-log",
    destination: "/hardhat-network/#console.log",
    permanent: false,
  },
  {
    source: "/discord",
    destination: "https://discord.gg/TETZs2KK4k",
    permanent: false,
  },
  {
    source: "/ignition-discord",
    destination: "https://discord.gg/7jBkZQXB25",
    permanent: false,
  },
  {
    source: "/hre",
    destination: "/advanced/hardhat-runtime-environment",
    permanent: false,
  },
  {
    source: "/nodejs-versions",
    destination: "/reference/stability-guarantees#node.js-versions-support",
    permanent: false,
  },
  {
    source: "/verify-custom-networks",
    destination:
      "/plugins/nomicfoundation-hardhat-verify#adding-support-for-other-networks",
    permanent: false,
  },
  {
    source: "/verify-multiple-networks",
    destination:
      "plugins/nomicfoundation-hardhat-verify.html#multiple-api-keys-and-alternative-block-explorers",
    permanent: false,
  },
  {
    source: "/metamask-issue",
    destination: "/hardhat-network/docs/metamask-issue",
    permanent: false,
  },
  {
    source: "/migrate-from-waffle",
    destination: "/hardhat-runner/docs/guides/migrating-from-hardhat-waffle",
    permanent: false,
  },
  {
    source: "/hardhat-runner/docs/guides/migrating-from-hardhat-waffle",
    destination: "/hardhat-runner/docs/advanced/migrating-from-hardhat-waffle",
    permanent: false,
  },
  {
    source: "/custom-hardfork-history",
    destination:
      "/hardhat-network/docs/guides/forking-other-networks.html#using-a-custom-hardfork-history",
    permanent: false,
  },
  {
    source: "/solidity-survey-2023",
    destination:
      "https://cryptpad.fr/form/#/2/form/view/pV-DdryeJoYUWvW+gXsFaMNynEY7t5mUsgeD1urgwSE",
    permanent: false,
  },
  {
    source: "/solidity-survey-2024",
    destination:
      "https://cryptpad.fr/form/#/2/form/view/9xjPVmdv8z0Cyyh1ejseMQ0igmx-TedH5CPST3PhRUk",
    permanent: false,
  },
  {
    source: "/solc-viair",
    destination:
      "/hardhat-runner/docs/reference/solidity-support#support-for-ir-based-codegen",
    permanent: false,
  },
  {
    source: "/chaining-async-matchers",
    destination:
      "/plugins/nomicfoundation-hardhat-chai-matchers#chaining-async-matchers",
    permanent: false,
  },
  {
    source: "/ignition-errors",
    destination: "/ignition/docs/guides/error-handling",
    permanent: false,
  },
  // top-level component URLs
  {
    source: "/hardhat-runner",
    destination: "/hardhat-runner/docs/getting-started#overview",
    permanent: false,
  },
  {
    source: "/hardhat-runner/docs",
    destination: "/hardhat-runner/docs/getting-started#overview",
    permanent: false,
  },
  {
    source: "/hardhat-network",
    destination: "/hardhat-network/docs/overview",
    permanent: false,
  },
  {
    source: "/hardhat-network/docs",
    destination: "/hardhat-network/docs/overview",
    permanent: false,
  },
  {
    source: "/hardhat-vscode",
    destination: "/hardhat-vscode/docs/overview",
    permanent: false,
  },
  {
    source: "/hardhat-vscode/docs",
    destination: "/hardhat-vscode/docs/overview",
    permanent: false,
  },
  {
    source: "/hardhat-chai-matchers",
    destination: "/hardhat-chai-matchers/docs/overview",
    permanent: false,
  },
  {
    source: "/hardhat-chai-matchers/docs",
    destination: "/hardhat-chai-matchers/docs/overview",
    permanent: false,
  },
  {
    source: "/hardhat-network-helpers",
    destination: "/hardhat-network-helpers/docs/overview",
    permanent: false,
  },
  {
    source: "/hardhat-network-helpers/docs",
    destination: "/hardhat-network-helpers/docs/overview",
    permanent: false,
  },
  {
    source: "/ignition",
    destination: "/ignition/docs/getting-started#overview",
    permanent: false,
  },
  {
    source: "/ignition/docs",
    destination: "/ignition/docs/getting-started#overview",
    permanent: false,
  },

  // legacy URLs
  {
    source: "/configuration",
    destination: "/hardhat-runner/docs/config",
    permanent: false,
  },
  {
    source: "/guides/create-plugin",
    destination: "/advanced/building-plugins",
    permanent: false,
  },
  {
    source: "/guides/mainnet-forking",
    destination: "/hardhat-network/docs/guides/forking-other-networks",
    permanent: false,
  },
  {
    source: "/hardhat-network/guides/mainnet-forking",
    destination: "/hardhat-network/docs/guides/forking-other-networks",
    permanent: false,
  },
  {
    source: "/hardhat-network/reference",
    destination: "/hardhat-network/docs/reference",
    permanent: false,
  },
  {
    source: "/hardhat-network/explanation/mining-modes",
    destination: "/hardhat-network/docs/explanation/mining-modes",
    permanent: false,
  },
  {
    source: "/troubleshooting/verbose-logging",
    destination: "/hardhat-runner/docs/troubleshooting/verbose-logging",
    permanent: false,
  },
  {
    source: "/troubleshooting/common-problems",
    destination: "/hardhat-runner/docs/troubleshooting/common-problems",
    permanent: false,
  },
  {
    source: "/errors",
    destination: "/hardhat-runner/docs/errors",
    permanent: false,
  },
  {
    source: "/reference/stability-guarantees",
    destination: "/hardhat-runner/docs/reference/stability-guarantees",
    permanent: false,
  },
  {
    source: "/reference/solidity-support",
    destination: "/hardhat-runner/docs/reference/solidity-support",
    permanent: false,
  },
  {
    source: "/plugins/:slug",
    destination: "/hardhat-runner/plugins/:slug",
    permanent: false,
  },
  {
    source: "/hardhat-runner/docs/guides/shorthand",
    destination: "/hardhat-runner/docs/guides/command-line-completion",
    permanent: false,
  },
  {
    source: "/hardhat-runner/docs/guides/tasks-and-scripts",
    destination: "/hardhat-runner/docs/guides/tasks",
    permanent: false,
  },
  // guides redirects, exceptions go first
  {
    source:
      "/guides/:slug(hardhat-runtime-environment|create-task|scripts|building-plugins|vscode-tests)",
    destination: "/hardhat-runner/docs/advanced/:slug",
    permanent: false,
  },
  {
    source:
      "/guides/:slug(waffle-testing|truffle-testing|truffle-migration|ganache-tests)",
    destination: "/hardhat-runner/docs/other-guides/:slug",
    permanent: false,
  },
  {
    source: "/guides/parallel-tests",
    destination:
      "/hardhat-runner/docs/guides/test-contracts#running-tests-in-parallel",
    permanent: false,
  },
  {
    source: "/guides/:slug",
    destination: "/hardhat-runner/docs/guides/:slug",
    permanent: false,
  },
  {
    source: "/advanced/:slug",
    destination: "/hardhat-runner/docs/advanced/:slug",
    permanent: false,
  },
  {
    source: "/chai-matchers",
    destination: "/hardhat-chai-matchers",
    permanent: false,
  },
  {
    source: "/chai-matchers/:slug",
    destination: "/hardhat-chai-matchers/docs/:slug",
    permanent: false,
  },
  {
    source: "/network-helpers",
    destination: "/hardhat-network-helpers",
    permanent: false,
  },
  {
    source: "/network-helpers/:slug",
    destination: "/hardhat-network-helpers/docs/:slug",
    permanent: false,
  },
  {
    source: "/hardhat-runner/plugins/nomiclabs-hardhat-etherscan",
    destination: "/hardhat-runner/plugins/nomicfoundation-hardhat-verify",
    permanent: false,
  },
  {
    source: "/hardhat-runner/plugins/nomiclabs-hardhat-ethers",
    destination: "/hardhat-runner/plugins/nomicfoundation-hardhat-ethers",
    permanent: false,
  },
  {
    source: "/release/:version",
    destination:
      "https://github.com/NomicFoundation/hardhat/releases/tag/hardhat%40:version",
    permanent: false,
  },
  ...loadErrorRedirects(),
];

module.exports = customRedirects;

function loadErrorRedirects() {
  try {
    return require(path.join(__dirname, "temp/error-redirects.json"));
  } catch (e) {
    return [];
  }
}

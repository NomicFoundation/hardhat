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
  {
    source: "/configuration",
    destination: "/hardhat-runner/docs/config",
    permanent: false
  },
  {
    source: "/config",
    destination: "/hardhat-runner/docs/config",
    permanent: false
  },
  { source: "/links/stack-traces", destination: "/", permanent: false },
  {
    source: "/reportbug",
    destination: "https://github.com/nomiclabs/hardhat/issues/new",
    permanent: false
  },
  {
    source: "/console-log",
    destination: "/hardhat-network/#console.log",
    permanent: false
  },
  {
    source: "/discord",
    destination: "https://discord.gg/TETZs2KK4k",
    permanent: false
  },
  {
    source: "/hre",
    destination: "/advanced/hardhat-runtime-environment",
    permanent: false
  },
  {
    source: "/nodejs-versions",
    destination: "/reference/stability-guarantees#node.js-versions-support",
    permanent: false
  },

  // Other redirects
  {
    source: "/guides/create-plugin",
    destination: "/advanced/building-plugins",
    permanent: false
  },
  {
    source: "/guides/mainnet-forking",
    destination: "/hardhat-network/guides/mainnet-forking",
    permanent: false
  },
  {
    source: "/verify-custom-networks",
    destination: "/plugins/nomiclabs-hardhat-etherscan#adding-support-for-other-networks",
    permanent: false
  },
  {
    source: "/verify-multiple-networks",
    destination: "plugins/nomiclabs-hardhat-etherscan.html#multiple-api-keys-and-alternative-block-explorers",
    permanent: false
  },
  {
    source: "/hardhat-runner",
    destination: "/hardhat-runner/docs/getting-started#overview",
    permanent: false
  },
  {
    source: "/hardhat-runner/docs",
    destination: "/hardhat-runner/docs/getting-started#overview",
    permanent: false
  },
  {
    source: "/hardhat-network",
    destination: "/hardhat-network/docs/overview",
    permanent: false
  },
  {
    source: "/hardhat-network/docs",
    destination: "/hardhat-network/docs/overview",
    permanent: false
  },
  {
    source: "/hardhat-vscode",
    destination: "/hardhat-vscode/docs/overview",
    permanent: false
  },
  {
    source: "/hardhat-vscode/docs",
    destination: "/hardhat-vscode/docs/overview",
    permanent: false
  },
  {
    source: "/hardhat-chai-matchers",
    destination: "/hardhat-chai-matchers/docs/overview",
    permanent: false
  },
  {
    source: "/hardhat-chai-matchers/docs",
    destination: "/hardhat-chai-matchers/docs/overview",
    permanent: false
  },
  {
    source: "/hardhat-network-helpers",
    destination: "/hardhat-network-helpers/docs/overview",
    permanent: false
  },
  {
    source: "/hardhat-network-helpers/docs",
    destination: "/hardhat-network-helpers/docs/overview",
    permanent: false
  },
  {
    source: "/getting-started",
    destination: "/hardhat-runner/docs/getting-started#overview",
    permanent: false
  },
  {
    source: "/hardhat-network/guides/mainnet-forking",
    destination: "/hardhat-network/docs/guides/mainnet-forking",
    permanent: false
  },
  {
    source: "/hardhat-network/reference",
    destination: "/hardhat-network/docs/reference",
    permanent: false
  },
  {
    source: "/hardhat-network/explanation/mining-modes",
    destination: "/hardhat-network/docs/explanation/mining-modes",
    permanent: false
  },
  {
    source: "/troubleshooting/verbose-logging",
    destination: "/hardhat-runner/docs/troubleshooting/verbose-logging",
    permanent: false
  },
  {
    source: "/troubleshooting/common-problems",
    destination: "/hardhat-runner/docs/troubleshooting/common-problems",
    permanent: false
  },
  {
    source: "/errors",
    destination: "/hardhat-runner/docs/errors",
    permanent: false
  },
  {
    source: "/reference/stability-guarantees",
    destination: "/hardhat-runner/docs/reference/stability-guarantees",
    permanent: false
  },
  {
    source: "/reference/solidity-support",
    destination: "hardhat-runner/docs/reference/solidity-support",
    permanent: false
  },
  {
    source: "/metamask-issue",
    destination: "/hardhat-network/docs/metamask-issue",
    permanent: false
  },

  // plugins
  {
    source: "/plugins",
    destination: "/hardhat-runner/plugins",
    permanent: false
  },
  {
    source: "/plugins/:slug",
    destination: "/hardhat-runner/plugins/:slug",
    permanent: false
  },

  // guides redirects, exceptions go first
  {
    source: "/guides/:slug(hardhat-runtime-environment|create-task|scripts|building-plugins|vscode-tests)",
    destination: "/hardhat-runner/docs/advanced/:slug",
    permanent: false
  },
  {
    source: "/guides/:slug(waffle-testing|truffle-testing|parallel-tests|truffle-migration|ganache-tests)",
    destination: "/other-guides/:slug",
    permanent: false
  },
  {
    source: "/guides/:slug",
    destination: "/hardhat-runner/docs/guides/:slug",
    permanent: false
  },
  {
    source: "/advanced/:slug",
    destination: "/hardhat-runner/docs/advanced/:slug",
    permanent: false
  },

  // chai-matchers
  {
    source: "/chai-matchers",
    destination: "/hardhat-chai-matchers",
    permanent: false
  },
  {
    source: "/chai-matchers/:slug",
    destination: "/hardhat-chai-matchers/docs/:slug",
    permanent: false
  },

  // network-helpers
  {
    source: "/network-helpers",
    destination: "/hardhat-network-helpers",
    permanent: false
  },
  {
    source: "/network-helpers/:slug",
    destination: "/hardhat-network-helpers/docs/:slug",
    permanent: false
  },

  ...loadErrorRedirects()
];


module.exports = customRedirects;

function loadErrorRedirects() {
  try {
    return require(path.join(__dirname, "temp/error-redirects.json"));
  } catch (e) {
    return [];
  }
}

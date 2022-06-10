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
    destination: "/config",
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

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

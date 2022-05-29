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
    destination: "/hardhat-network/#console-log",
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

  // Hardhat migration
  { source: "/buidler-evm", destination: "/hardhat-network", permanent: false },
  {
    source: "/advanced/buidler-runtime-environment",
    destination: "/advanced/hardhat-runtime-environment",
    permanent: false
  },
  {
    source: "/docs/guides/buidler-console",
    destination: "/docs/guides/hardhat-console",
    permanent: false
  },
  {
    source: "/tutorial/creating-a-new-buidler-project",
    destination: "/tutorial/creating-a-new-hardhat-project",
    permanent: false
  },
  {
    source: "/tutorial/debugging-with-buidler-evm",
    destination: "/tutorial/debugging-with-hardhat-network",
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

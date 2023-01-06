/** @type {import('next').NextConfig} */
const path = require("path");
const withLinaria = require("next-linaria");
const withPlugins = require("next-compose-plugins");

const customRedirects = require("./redirects.config");
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const linariaConfig = withLinaria({
  async redirects() {
    return [
      {
        /**
         * NOTE: this removes '.html' extensions from URLs
         * e.g. https://hardhat.org/hardhat-network/explanation/mining-modes.html becomes
         * https://hardhat.org/hardhat-network/explanation/mining-modes
         *
         * We need this to keep the links of the previous version workable.
         *
         * The only exception is the privacy-policy.html file, which we host in
         * public/
         */
        source: "/:slug((?!privacy-policy).*).html",
        destination: "/:slug*",
        permanent: true,
      },
      ...customRedirects,
    ];
  },
  reactStrictMode: true,
  future: {
    webpack5: true,
  },
  webpack(baseConfig) {
    // eslint-disable-next-line no-param-reassign
    baseConfig.resolve.alias.theme = path.resolve(__dirname, "./src/themes");
    return baseConfig;
  },
  linaria: {
    cacheDirectory:
      process.env.NODE_ENV === "production"
        ? ".next/cache/.linaria-cache"
        : ".linaria-cache",
  },
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  images: {
    dangerouslyAllowSVG: true,
    domains: ["img.shields.io", "hardhat.org"],
  },
});

module.exports = withPlugins([linariaConfig, withBundleAnalyzer]);
module.exports.linariaConfig = linariaConfig;

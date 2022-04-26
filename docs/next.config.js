/** @type {import('next').NextConfig} */
const path = require("path");
const withLinaria = require("next-linaria");
const withPlugins = require("next-compose-plugins");

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const linariaConfig = withLinaria({
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
});

module.exports = linariaConfig;

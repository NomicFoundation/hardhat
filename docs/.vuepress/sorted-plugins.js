const plugins = require("./plugins.js");

try {
  const downloads = require("./plugin-downloads.json");

  plugins.officialPlugins.sort(
    (p1, p2) => downloads[p2.name] - downloads[p1.name]
  );

  plugins.communityPlugins.sort(
    (p1, p2) => downloads[p2.name] - downloads[p1.name]
  );
} catch {
  // we just don't sort here
}

module.exports = plugins;

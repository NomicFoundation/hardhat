const fs = require("fs");
const plugins = require("./plugins.js");

if (fs.existsSync(__dirname + "/plugin-downloads.json")) {
  const downloads = require("./plugin-downloads.json");

  plugins.sort((p1, p2) => downloads[p2.name] - downloads[p1.name]);
}

module.exports = plugins;

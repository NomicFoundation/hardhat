const path = require("path");
const glob = require("glob");

const pattern = path.join(__dirname, "..", "tasks", "*.js");

glob.sync(pattern).sort().forEach(f => require(f));

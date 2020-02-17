const plugins = require("./.vuepress/plugins.js");
import { writeFileSync } from "fs";

let bashDownload = `
set -x
set -e
`;

plugins.forEach(plugin => {
  const readmeUrl = plugin.readmeUrl ? plugin.readmeUrl : plugin.url.replace(
    /.+github.com(.+)\/tree(.+)$/,
    "https://raw.githubusercontent.com$1$2" + "/README.md"
  );
  const readmePath =
    "plugins/" + plugin.name.replace("/", "-").replace(/^@/, "") + ".md";

  bashDownload += `wget ${readmeUrl} -O ${readmePath}
`;
});

writeFileSync("wget-readmes.sh", bashDownload);

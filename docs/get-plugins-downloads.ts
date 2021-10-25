import fs from "fs";
import fetch from "node-fetch";

const plugins = require("./.vuepress/plugins");

async function getLastMonthDownloads(npmPackage: string): Promise<number> {
  const res = await fetch(
    `https://api.npmjs.org/downloads/point/last-month/${npmPackage}`,
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );

  if (res.status === 404) {
    return 0;
  }

  const json = await res.json();

  return json.downloads;
}

async function main() {
  const downloads: Array<{ [plugin: string]: number }> = await Promise.all(
    [...plugins.officialPlugins, ...plugins.communityPlugins].map(
      async (p: any) => ({
        [p.name]: await getLastMonthDownloads(p.npmPackage ?? p.name),
      })
    )
  );

  downloads.sort((p1, p2) => Object.values(p2)[0] - Object.values(p1)[0]);

  const result = Object.assign({}, ...downloads);
  fs.writeFileSync(
    __dirname + "/.vuepress/plugin-downloads.json",
    JSON.stringify(result, undefined, 2)
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

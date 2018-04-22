const path = require("path");
const fs = require("fs-extra");
const util = require("util");
const glob = util.promisify(require("glob"));

async function getModificationDatesInDir(dir) {
  const pattern = path.join(dir, "**");
  const files = await glob(pattern);
  const stats = await Promise.all(files.map(f => fs.stat(f)));
  return stats.map(s => new Date(s.mtime));
}

async function getLastModificationDateInDir(dir) {
  const dates = await getModificationDatesInDir(dir);

  if (dates.length === 0) {
    return undefined;
  }

  return dates.reduce((d1, d2) => d1.getTime() > d2.getTime() ? d1 : d2 )
}

async function areArtifactsCached(sourcesDir, artifactsDir) {
  const lastSourcesModification = await getLastModificationDateInDir(sourcesDir);
  const lastArtifactsModification = await getLastModificationDateInDir(artifactsDir);

  if (lastArtifactsModification === undefined || lastSourcesModification === undefined) {
    return false;
  }

  return lastArtifactsModification.getTime() > lastSourcesModification.getTime();
}
module.exports = { areArtifactsCached }
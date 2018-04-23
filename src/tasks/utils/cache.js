const path = require("path");
const fs = require("fs-extra");
const util = require("util");
const glob = util.promisify(require("glob"));

const {getUserConfigPath} = require("../../core/config")

async function getModificationDate(file) {
  const stat = await fs.stat(file);
  return new Date(stat.mtime);
}

async function getConfigModificationDate() {
  const configPath = getUserConfigPath();
  return getModificationDate(configPath);
}

async function getModificationDatesInDir(dir) {
  const pattern = path.join(dir, "**");
  const files = await glob(pattern);
  return Promise.all(files.map(getModificationDate));

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
  const configModification = await  getConfigModificationDate();

  if (lastArtifactsModification === undefined || lastSourcesModification === undefined) {
    return false;
  }

  // If the config was changed we invalidate the cache
  if (configModification.getTime() > lastArtifactsModification.getTime()) {
    return false;
  }

  return lastArtifactsModification.getTime() > lastSourcesModification.getTime();
}

module.exports = { areArtifactsCached };
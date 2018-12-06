import path from "path";

import { BuidlerConfig } from "../../types";
import { glob } from "../../util/glob";

async function getModificationDate(file: string): Promise<Date> {
  const fsExtra = await import("fs-extra");
  const stat = await fsExtra.stat(file);
  return new Date(stat.mtime);
}

async function getConfigModificationDate(config: BuidlerConfig): Promise<Date> {
  return getModificationDate(config.paths.configFile);
}

async function getModificationDatesInDir(dir: string): Promise<Date[]> {
  const pattern = path.join(dir, "**");
  const files = await glob(pattern);
  const promises: Array<Promise<Date>> = files.map(getModificationDate);
  return Promise.all(promises);
}

async function getLastModificationDateInDir(dir: string) {
  const dates = await getModificationDatesInDir(dir);

  if (dates.length === 0) {
    return undefined;
  }

  return dates.reduce((d1, d2) => (d1.getTime() > d2.getTime() ? d1 : d2));
}

export async function areArtifactsCached(
  sourcesDir: string,
  artifactsDir: string,
  config: BuidlerConfig
) {
  const lastSourcesModification = await getLastModificationDateInDir(
    sourcesDir
  );
  const lastArtifactsModification = await getLastModificationDateInDir(
    artifactsDir
  );
  const configModification = await getConfigModificationDate(config);

  if (
    lastArtifactsModification === undefined ||
    lastSourcesModification === undefined
  ) {
    return false;
  }

  // If the config was changed we invalidate the cache
  if (configModification.getTime() > lastArtifactsModification.getTime()) {
    return false;
  }

  return (
    lastArtifactsModification.getTime() > lastSourcesModification.getTime()
  );
}

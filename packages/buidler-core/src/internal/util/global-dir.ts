import fsExtra from "fs-extra";

interface DirEntry {
  path: string;
  live: boolean;
}

interface DirCache {
  [name: string]: DirEntry;
}

let paths: DirCache;

async function generatePaths() {
  const { default: envPaths } = await import("env-paths");
  const generatedPaths = envPaths("buidler");
  paths = {
    config: {
      path: generatedPaths.config,
      live: false,
    },
    data: {
      path: generatedPaths.data,
      live: false,
    },
    cache: {
      path: generatedPaths.cache,
      live: false,
    },
  };
  return paths;
}

async function getDir(name: string): Promise<string> {
  const pathsCache = paths === undefined ? await generatePaths() : paths;
  const dir = pathsCache[name];
  if (!dir.live) {
    await fsExtra.ensureDir(dir.path);
    dir.live = true;
  }
  return dir.path;
}

export function getConfigDir(): Promise<string> {
  return getDir("config");
}

export function getDataDir(): Promise<string> {
  return getDir("data");
}

export function getCacheDir(): Promise<string> {
  return getDir("cache");
}

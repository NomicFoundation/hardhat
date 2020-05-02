import { join } from "path";

import userHomeDir from "./user-home-dir";

export function getCacheDir(): string {
  if (process.platform === "win32") {
    // process.env.TEMP also exists, but most apps put caches here.
    return join(getWin32AppDataDir(), "Cache");
  }
  // Other platforms: darwin, linux...
  if (process.env.XDG_CACHE_HOME !== undefined) {
    // Respect XDG_CACHE_HOME, if set:
    return join(process.env.XDG_CACHE_HOME, "buidler");
  }
  if (process.platform === "darwin") {
    // Darwin default:
    return join(userHomeDir, "Library", "Caches", "buidler");
  }
  // Linux default:
  return join(userHomeDir, ".cache", "buidler");
}

export function getConfigDir(): string {
  if (process.platform === "win32") {
    // Alternative: return path.join(WIN32_APPDATA_DIR, 'Config')
    return join(getWin32AppDataDir(), "Config");
  }
  // Other platforms: darwin, linux...
  return join(
    process.env.XDG_CONFIG_HOME !== undefined
      ? process.env.XDG_CONFIG_HOME
      : join(userHomeDir, ".config"),
    "buidler"
  );
}

export function getDataDir(): string {
  if (process.platform === "win32") {
    return join(getWin32AppDataDir(), "Data");
  }
  // Other platforms: darwin, linux...
  return join(
    process.env.XDG_DATA_HOME !== undefined
      ? process.env.XDG_DATA_HOME
      : join(userHomeDir, ".local", "share"),
    "buidler"
  );
}

function getWin32AppDataDir(): string {
  if (process.env.LOCALAPPDATA !== undefined) {
    return join(process.env.LOCALAPPDATA, "buidler");
  }
  return join(userHomeDir, "AppData", "Local", "buidler");
}

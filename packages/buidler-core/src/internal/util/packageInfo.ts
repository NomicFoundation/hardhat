import findup from "find-up";
import path from "path";

import { join } from "./join";

async function getPackageJsonPath(): Promise<string> {
  return findClosestPackageJson(__filename)!;
}

export async function getPackageRoot(): Promise<string> {
  const packageJsonPath = await getPackageJsonPath();

  return path.dirname(packageJsonPath);
}

export interface PackageJson {
  name: string;
  version: string;
  engines: {
    node: string;
  };
}

function findClosestPackageJson(file: string): string | null {
  return findup.sync("package.json", { cwd: path.dirname(file) });
}

export async function getPackageJson(): Promise<PackageJson> {
  const fsExtra = await import("fs-extra");
  const root = await getPackageRoot();

  return fsExtra.readJSON(join(root, "package.json"));
}

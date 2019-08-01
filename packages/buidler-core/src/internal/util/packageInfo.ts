import findup from "find-up";
import fsExtra from "fs-extra";
import path from "path";

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
  const root = await getPackageRoot();
  return fsExtra.readJSON(path.join(root, "package.json"));
}

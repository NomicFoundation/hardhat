import findup from "find-up";
import fsExtra from "fs-extra";
import path from "path";
import { assertHardhatInvariant } from "../errors/errors";

export interface PackageJson {
  name: string;
  version: string;
  type?: "commonjs" | "module";
  engines: {
    node: string;
  };
}

export function getHardhatVersion(): string {
  const packageJsonPath = findClosestPackageJson(__filename);

  assertHardhatInvariant(
    packageJsonPath !== null,
    "There should be a package.json in hardhat-core's root directory",
  );

  const packageJson = fsExtra.readJsonSync(packageJsonPath);
  return packageJson.version;
}

export function findClosestPackageJson(file: string): string | null {
  return findup.sync("package.json", { cwd: path.dirname(file) });
}

export async function getPackageName(file: string): Promise<string> {
  const packageJsonPath = findClosestPackageJson(file);
  if (packageJsonPath !== null && packageJsonPath !== "") {
    const packageJson: PackageJson = await fsExtra.readJSON(packageJsonPath);
    return packageJson.name;
  }
  return "";
}

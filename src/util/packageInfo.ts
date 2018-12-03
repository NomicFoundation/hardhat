async function getPackageJsonPath(): Promise<string> {
  const fsExtra = await import("fs-extra");

  const nonCompiledPath = __dirname + "/../../package.json";
  const compiledPath = __dirname + "/../../../package.json";

  const path = (await fsExtra.pathExists(nonCompiledPath))
    ? nonCompiledPath
    : compiledPath;

  return await fsExtra.realpath(path);
}

export async function getPackageRoot(): Promise<string> {
  const path = await import("path");
  const packageJsonPath = await getPackageJsonPath();

  return path.dirname(packageJsonPath);
}

export interface PackageJson {
  name: string;
  version: string;
}

export async function getPackageJson(): Promise<PackageJson> {
  const fsExtra = await import("fs-extra");
  const root = await getPackageRoot();

  return await fsExtra.readJSON(root + "/package.json");
}

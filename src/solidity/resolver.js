"use strict";

const importLazy = require("import-lazy")(require);
const fs = importLazy("fs-extra");
const path = require("path");

class ResolvedFile {
  constructor(
    globalName,
    absolutePath,
    content,
    lastModificationDate,
    libraryName,
    libraryVersion
  ) {
    this.globalName = globalName;
    this.absolutePath = absolutePath;
    this.content = content;
    this.lastModificationDate = lastModificationDate;

    if (libraryName) {
      this.library = {
        name: libraryName,
        version: libraryVersion
      };
    }
  }

  inspect() {
    return `ResolvedFile[${this.getNameWithVersion()} - Last modification: ${
      this.lastModificationDate
    }]`;
  }

  getNameWithVersion() {
    return (
      this.globalName +
      (this.library !== undefined ? `@v${this.library.version}` : "")
    );
  }
}

class Resolver {
  constructor(config) {
    this.config = config;
  }

  async resolveProjectSourceFile(pathToResolve) {
    if (!(await fs.exists(pathToResolve))) {
      throw new Error(`File ${pathToResolve} doesn't exist.`);
    }

    const absolutePath = await fs.realpath(pathToResolve);

    if (!absolutePath.startsWith(this.config.paths.root)) {
      throw new Error(`File ${pathToResolve} is outside the project.`);
    }

    if (absolutePath.includes("node_modules")) {
      throw new Error(
        `File ${pathToResolve} is a library file treated as local.`
      );
    }

    const globalName = absolutePath.slice(this.config.paths.root.length + 1);

    return this._resolveFile(globalName, absolutePath);
  }

  async resolveLibrarySourceFile(globalName) {
    const libraryName = globalName.slice(0, globalName.indexOf("/"));

    let packagePath;
    try {
      packagePath = require.resolve(path.join(libraryName, "package.json"));
    } catch (e) {
      throw new Error(`Library ${libraryName} is not installed.`);
    }

    let absolutePath;
    try {
      absolutePath = require.resolve(globalName);
    } catch (e) {
      throw new Error(`File ${globalName} doesn't exist.`);
    }

    const packageInfo = await fs.readJson(packagePath);
    const libraryVersion = packageInfo.version;

    return this._resolveFile(
      globalName,
      absolutePath,
      libraryName,
      libraryVersion
    );
  }

  async resolveImport(from, imported) {
    if (this._isRelativeImport(imported)) {
      if (from.library === undefined) {
        return this.resolveProjectSourceFile(
          path.normalize(path.join(path.dirname(from.absolutePath), imported))
        );
      }

      const globalName = path.normalize(
        path.dirname(from.globalName) + "/" + imported
      );

      const isIllegal = !globalName.startsWith(from.library.name + path.sep);

      if (isIllegal) {
        throw new Error("Illegal import " + imported + " from " + from.name);
      }

      imported = globalName;
    }

    return this.resolveLibrarySourceFile(imported);
  }

  async _resolveFile(globalName, absolutePath, libraryName, libraryVersion) {
    const content = await fs.readFile(absolutePath, { encoding: "utf8" });
    const stats = await fs.stat(absolutePath);
    const lastModificationDate = new Date(stats.mtime);

    return new ResolvedFile(
      globalName,
      absolutePath,
      content,
      lastModificationDate,
      libraryName,
      libraryVersion
    );
  }

  _isRelativeImport(imported) {
    return imported.startsWith("./") || imported.startsWith("../");
  }
}

module.exports = { ResolvedFile, Resolver };

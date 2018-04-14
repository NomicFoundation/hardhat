const fs = require("fs-extra");
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
    const atVersion =
      this.library !== undefined ? `@${this.library.version}` : "";
    return `ResolvedFile[${this.globalName}${atVersion} - Last modification: ${
      this.lastModificationDate
    }]`;
  }
}

class Resolver {
  constructor(config) {
    this.config = config;
    this.nodeModulesPath = path.join(this.config.root, "node_modules");
  }

  resolveProjectSourceFile(pathToResolve) {
    if (!fs.existsSync(pathToResolve)) {
      throw new Error(`File ${pathToResolve} doesn't exist.`);
    }

    const absolutePath = fs.realpathSync(pathToResolve);

    if (!absolutePath.startsWith(this.config.root)) {
      throw new Error(`File ${pathToResolve} is outside the project.`);
    }

    if (absolutePath.startsWith(this.nodeModulesPath)) {
      throw new Error(
        `File ${pathToResolve} is a library file treated as local.`
      );
    }

    const globalName = absolutePath.slice(config.root.length + 1);

    return this._resolveFile(globalName, absolutePath);
  }

  resolveLibrarySourceFile(globalName) {
    const libraryName = globalName.slice(0, globalName.indexOf("/"));
    const libraryPath = path.join(this.nodeModulesPath, libraryName);

    if (!fs.existsSync(libraryPath)) {
      throw new Error(`Library ${libraryName} not installed`);
    }

    const packageInfo = fs.readJsonSync(path.join(libraryPath, "package.json"));

    const libraryVersion = packageInfo.version;

    const absolutePath = path.join(
      libraryPath,
      globalName.slice(globalName.indexOf("/") + 1)
    );

    return this._resolveFile(
      globalName,
      absolutePath,
      libraryName,
      libraryVersion
    );
  }

  _resolveFile(globalName, absolutePath, libraryName, libraryVersion) {
    const content = fs.readFileSync(absolutePath, { encoding: "utf8" });
    const stats = fs.statSync(absolutePath);
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

  resolveImport(from, imported) {
    if (Resolver.isRelativeImport(imported)) {
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

  static isRelativeImport(imported) {
    return imported.startsWith("./") || imported.startsWith("../");
  }
}

module.exports = { ResolvedFile, Resolver };

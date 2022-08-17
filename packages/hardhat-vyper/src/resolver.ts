import type { FileContent, ResolvedFile as IResolvedFile } from "./types";

import path from "path";
import fsExtra from "fs-extra";

import {
  validateSourceNameFormat,
  validateSourceNameExistenceAndCasing,
  isLocalSourceName,
} from "hardhat/utils/source-names";
import { createNonCryptographicHashBasedIdentifier } from "hardhat/internal/util/hash";
import { HardhatError } from "hardhat/internal/core/errors";
import { ERRORS } from "hardhat/internal/core/errors-list";

import { VyperPluginError } from "./util";
import { Parser } from "./parser";

export class ResolvedFile implements IResolvedFile {
  constructor(
    public readonly sourceName: string,
    public readonly absolutePath: string,
    public readonly content: FileContent,
    public readonly contentHash: string,
    public readonly lastModificationDate: Date
  ) {}
}

export class Resolver {
  constructor(
    private readonly _projectRoot: string,
    private readonly _parser: Parser,
    private readonly _readFile: (absolutePath: string) => Promise<string>
  ) {}

  public resolveSourceName = async (
    sourceName: string
  ): Promise<ResolvedFile> => {
    validateSourceNameFormat(sourceName);

    if (await isLocalSourceName(this._projectRoot, sourceName)) {
      return this._resolveLocalSourceName(sourceName);
    }

    throw new VyperPluginError(
      `This plugin does not currently support importing interfaces from a library or package.

Please open an issue on our github if you'd like to see this feature implemented:
https://github.com/nomiclabs/hardhat/issues/new
`
    );
  };

  private async _resolveLocalSourceName(
    sourceName: string
  ): Promise<ResolvedFile> {
    await this._validateSourceNameExistenceAndCasing(
      this._projectRoot,
      sourceName
    );

    const absolutePath = path.join(this._projectRoot, sourceName);
    return this._resolveFile(sourceName, absolutePath);
  }

  private async _resolveFile(
    sourceName: string,
    absolutePath: string
  ): Promise<ResolvedFile> {
    const rawContent = await this._readFile(absolutePath);
    const stats = await fsExtra.stat(absolutePath);
    const lastModificationDate = new Date(stats.ctime);

    const contentHash = createNonCryptographicHashBasedIdentifier(
      Buffer.from(rawContent)
    ).toString("hex");

    const parsedContent = this._parser.parse(
      rawContent,
      absolutePath,
      contentHash
    );

    const content = {
      rawContent,
      ...parsedContent,
    };

    return new ResolvedFile(
      sourceName,
      absolutePath,
      content,
      contentHash,
      lastModificationDate
    );
  }

  private async _validateSourceNameExistenceAndCasing(
    fromDir: string,
    sourceName: string
  ): Promise<void> {
    try {
      await validateSourceNameExistenceAndCasing(fromDir, sourceName);
    } catch (error: unknown) {
      if (
        HardhatError.isHardhatErrorType(
          error,
          ERRORS.SOURCE_NAMES.FILE_NOT_FOUND
        )
      ) {
        throw new VyperPluginError(`File ${sourceName} doesn't exist.`);
      }

      if (
        HardhatError.isHardhatErrorType(error, ERRORS.SOURCE_NAMES.WRONG_CASING)
      ) {
        throw new VyperPluginError(
          `Trying to resolve the file ${sourceName} but its correct case-sensitive name is ${error.messageArguments.correct}`
        );
      }

      if (error instanceof Error) {
        throw new VyperPluginError(
          `An unknown error has occurred when attempting to resolve vyper file ${sourceName}`,
          error
        );
      }
    }
  }
}

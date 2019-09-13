import { bufferToHex } from "ethereumjs-util";

import { getUserConfigPath } from "../../core/project-structure";

import {
  normalizeLibraryRuntimeBytecodeIfNecessary,
  zeroOutAddresses
} from "./library-utils";
import { EvmMessageTrace, isCreateTrace } from "./message-trace";
import { Bytecode } from "./model";

/**
 * This class represent a somewhat special Trie of bytecodes.
 *
 * What makes it special is that every node has a set of all of its descendants and its depth.
 */
class BytecodeTrie {
  public static isBytecodeTrie(o: any): o is BytecodeTrie {
    if (o === undefined || o === null) {
      return false;
    }

    return "childNodes" in o;
  }

  public readonly childNodes: Map<number, BytecodeTrie> = new Map();
  public readonly descendants: Set<Bytecode> = new Set();
  public match?: Bytecode;

  constructor(public readonly depth: number) {}

  public add(bytecode: Bytecode) {
    // tslint:disable-next-line no-this-assignment
    let trieNode: BytecodeTrie = this;
    for (
      let currentCodeByte = 0;
      currentCodeByte <= bytecode.normalizedCode.length;
      currentCodeByte += 1
    ) {
      if (currentCodeByte === bytecode.normalizedCode.length) {
        // If multiple contracts with the exact same bytecode are added we keep the last of them,
        // which is probably correct, especially if we are going to support multiple compilations
        trieNode.match = bytecode;
        return;
      }

      const byte = bytecode.normalizedCode[currentCodeByte];
      trieNode.descendants.add(bytecode);

      let childNode = trieNode.childNodes.get(byte);
      if (childNode === undefined) {
        childNode = new BytecodeTrie(currentCodeByte);
        trieNode.childNodes.set(byte, childNode);
      }

      trieNode = childNode;
    }
  }

  /**
   * Searches for a bytecode. If it's an exact match, it is returned. If there's no match, but a
   * prefix of the code is found in the trie, the node of the longest prefix is returned. If the
   * entire code is covered by the trie, and there's no match, we return undefined.
   */
  public search(
    code: Buffer,
    currentCodeByte: number = 0
  ): Bytecode | BytecodeTrie | undefined {
    if (currentCodeByte > code.length) {
      return undefined;
    }

    // tslint:disable-next-line no-this-assignment
    let trieNode: BytecodeTrie = this;
    for (; currentCodeByte <= code.length; currentCodeByte += 1) {
      if (currentCodeByte === code.length) {
        return trieNode.match;
      }

      const childNode = trieNode.childNodes.get(code[currentCodeByte]);

      if (childNode === undefined) {
        return trieNode;
      }

      trieNode = childNode;
    }
  }
}

export class ContractsIdentifier {
  private _trie = new BytecodeTrie(-1);
  private _cache: Map<string, Bytecode> = new Map();

  constructor(private readonly _enableCache = true) {
    const config = getUserConfigPath();
  }

  public addBytecode(bytecode: Bytecode) {
    this._trie.add(bytecode);
    this._cache.clear();
  }

  public getBytecodeFromMessageTrace(
    trace: EvmMessageTrace
  ): Bytecode | undefined {
    const normalizedCode = normalizeLibraryRuntimeBytecodeIfNecessary(
      trace.code
    );

    let normalizedCodeHex: string | undefined;
    if (this._enableCache) {
      normalizedCodeHex = bufferToHex(normalizedCode);
      const cached = this._cache.get(normalizedCodeHex);

      if (cached !== undefined) {
        return cached;
      }
    }

    const result = this._searchBytecode(trace, normalizedCode);

    if (this._enableCache) {
      if (result !== undefined) {
        this._cache.set(normalizedCodeHex!, result);
      }
    }

    return result;
  }

  private _searchBytecode(
    trace: EvmMessageTrace,
    code: Buffer,
    normalizeLibraries = true,
    trie = this._trie,
    firstByteToSearch = 0
  ): Bytecode | undefined {
    const searchResult = trie.search(code, firstByteToSearch);

    if (searchResult === undefined) {
      return undefined;
    }

    if (!BytecodeTrie.isBytecodeTrie(searchResult)) {
      return searchResult;
    }

    // Create traces are followed by metadata that we don't index
    if (
      isCreateTrace(trace) &&
      searchResult.match !== undefined &&
      searchResult.match.isDeployment
    ) {
      return searchResult.match;
    }

    if (normalizeLibraries) {
      for (const bytecodeWithLibraries of searchResult.descendants) {
        if (bytecodeWithLibraries.libraryAddressPositions.length === 0) {
          continue;
        }

        const normalizedCode = zeroOutAddresses(
          code,
          bytecodeWithLibraries.libraryAddressPositions
        );

        const normalizedResult = this._searchBytecode(
          trace,
          normalizedCode,
          false,
          searchResult,
          searchResult.depth + 1
        );

        if (normalizedResult !== undefined) {
          return normalizedResult;
        }
      }
    }

    return undefined;
  }
}

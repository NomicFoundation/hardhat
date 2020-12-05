import { bufferToHex } from "ethereumjs-util";

import {
  normalizeLibraryRuntimeBytecodeIfNecessary,
  zeroOutAddresses,
  zeroOutSlices,
} from "./library-utils";
import { EvmMessageTrace, isCreateTrace } from "./message-trace";
import { Bytecode } from "./model";
import { Opcode } from "./opcodes";

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

  constructor(
    public readonly depth: number,
    public readonly parent?: BytecodeTrie
  ) {}

  public add(bytecode: Bytecode) {
    // tslint:disable-next-line no-this-assignment
    let trieNode: BytecodeTrie = this;
    for (
      let currentCodeByte = 0;
      currentCodeByte <= bytecode.normalizedCode.length;
      currentCodeByte += 1
    ) {
      if (currentCodeByte === bytecode.normalizedCode.length) {
        // If multiple contracts with the exact same bytecode are added we keep the last of them.
        // Note that this includes the metadata hash, so the chances of happening are pretty remote, unless
        // in super artificial cases that we have in our test suite.
        trieNode.match = bytecode;
        return;
      }

      const byte = bytecode.normalizedCode[currentCodeByte];
      trieNode.descendants.add(bytecode);

      let childNode = trieNode.childNodes.get(byte);
      if (childNode === undefined) {
        childNode = new BytecodeTrie(currentCodeByte, trieNode);
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

  constructor(private readonly _enableCache = true) {}

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

    // Deployment messages have their abi-encoded arguments at the end of the bytecode.
    //
    // We don't know how long those arguments are, as we don't know which contract is being
    // deployed, hence we don't know the signature of its constructor.
    //
    // To make things even harder, we can't trust that the user actually passed the right
    // amount of arguments.
    //
    // Luckily, the chances of a complete deployment bytecode being the prefix of another one are
    // remote. For example, most of the time it ends with its metadata hash, which will differ.
    //
    // We take advantage of this last observation, and just return the bytecode that exactly
    // matched the searchResult (sub)trie that we got.
    if (
      isCreateTrace(trace) &&
      searchResult.match !== undefined &&
      searchResult.match.isDeployment
    ) {
      return searchResult.match;
    }

    if (normalizeLibraries) {
      for (const bytecodeWithLibraries of searchResult.descendants) {
        if (
          bytecodeWithLibraries.libraryAddressPositions.length === 0 &&
          bytecodeWithLibraries.immutableReferences.length === 0
        ) {
          continue;
        }

        const normalizedLibrariesCode = zeroOutAddresses(
          code,
          bytecodeWithLibraries.libraryAddressPositions
        );

        const normalizedCode = zeroOutSlices(
          normalizedLibrariesCode,
          bytecodeWithLibraries.immutableReferences
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

    // If we got here we may still have the contract, but with a different metadata hash.
    // What we do in this case is looking for the end of the code, excluding the metadata hash,
    // and check if one of its descendants matches except for the metadata.

    const endOfCodeTrie = this._getEndOfActualCodesTrie(searchResult, code);

    if (endOfCodeTrie !== undefined) {
      const endOfMetadata = this._getEndOfMetadata(code, endOfCodeTrie.depth);

      if (endOfMetadata !== undefined) {
        for (const descendant of endOfCodeTrie.descendants) {
          if (descendant.normalizedCode.length === endOfMetadata + 1) {
            return descendant;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * This function looks for the trie that matched the end of the actual bytecode,
   * before the metadata hash.
   *
   * The reason we need this function is that the metadata hashes can have common prefixes,
   * and we want to ignore them.
   *
   * TODO: There's a small chance of false positive happening here. If we want to
   *  discard that possibility we need to decode the code into instructions and
   *  find the first appearance of REVERT INVALID.
   */
  private _getEndOfActualCodesTrie(
    latestMatchedTire: BytecodeTrie,
    code: Buffer
  ): BytecodeTrie | undefined {
    let endOfBytecodeTrie: BytecodeTrie | undefined = latestMatchedTire;

    while (endOfBytecodeTrie !== undefined) {
      if (
        code[endOfBytecodeTrie.depth] === Opcode.INVALID &&
        code[endOfBytecodeTrie.depth - 1] === Opcode.REVERT
      ) {
        return endOfBytecodeTrie;
      }

      endOfBytecodeTrie = endOfBytecodeTrie.parent;
    }
  }

  /**
   * This function looks for the end of the metadata hash, and returns undefined if
   * it can't find it.
   */
  private _getEndOfMetadata(code: Buffer, endOfActualCode: number) {
    let endOfMetadata = code.length - 1;

    while (endOfMetadata > endOfActualCode) {
      // The last two bytes of the metadata hash are its big endian length
      // so we check for that.
      //
      // We just check for the length here. Chances of a false positive are very low.
      const length = code[endOfMetadata] + code[endOfMetadata - 1] * 256;
      if (endOfActualCode + 2 + length === endOfMetadata) {
        return endOfMetadata;
      }

      endOfMetadata -= 1;
    }
  }
}

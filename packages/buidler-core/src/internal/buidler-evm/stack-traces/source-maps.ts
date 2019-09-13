import { Instruction, JumpType, SourceFile, SourceLocation } from "./model";
import { getOpcodeLength, getPushLength, isJump, isPush } from "./opcodes";

export interface SourceMapLocation {
  offset: number;
  length: number;
  file: number;
}

export interface SourceMap {
  location: SourceMapLocation;
  jumpType: JumpType;
}

function jumpLetterToJumpType(letter: string): JumpType {
  if (letter === "i") {
    return JumpType.INTO_FUNCTION;
  }

  if (letter === "o") {
    return JumpType.OUTOF_FUNCTION;
  }
  return JumpType.NOT_JUMP;
}

function uncompressSourcemaps(compressedSourcemap: string): SourceMap[] {
  const mappings: SourceMap[] = [];

  const compressedMappings = compressedSourcemap.split(";");

  for (let i = 0; i < compressedMappings.length; i++) {
    const parts = compressedMappings[i].split(":");

    mappings.push({
      location: {
        offset:
          parts[0] !== undefined && parts[0] !== ""
            ? +parts[0]
            : mappings[i - 1].location.offset,
        length:
          parts[1] !== undefined && parts[1] !== ""
            ? +parts[1]
            : mappings[i - 1].location.length,
        file:
          parts[2] !== undefined && parts[2] !== ""
            ? +parts[2]
            : mappings[i - 1].location.file
      },
      jumpType:
        parts[3] !== undefined && parts[3] !== ""
          ? jumpLetterToJumpType(parts[3])
          : mappings[i - 1].jumpType
    });
  }

  return mappings;
}

export function decodeInstructions(
  bytecode: Buffer,
  compressedSourcemaps: string,
  fileIdToSourceFile: Map<number, SourceFile>
): Instruction[] {
  const sourceMaps = uncompressSourcemaps(compressedSourcemaps);

  const instructions: Instruction[] = [];

  let bytesIndex = 0;

  // Solidity inlines some data after the contract, so we stop decoding
  // as soon as we have enough instructions as uncompressed mappings. This is
  // not very documented, but we manually tested that it works.
  while (instructions.length < sourceMaps.length) {
    const pc = bytesIndex;
    const opcode = bytecode[pc];
    const sourceMap = sourceMaps[instructions.length];
    let pushData: Buffer | undefined;
    let location: SourceLocation | undefined;

    const jumpType =
      isJump(opcode) && sourceMap.jumpType === JumpType.NOT_JUMP
        ? JumpType.INTERNAL_JUMP
        : sourceMap.jumpType;

    if (isPush(opcode)) {
      const length = getPushLength(opcode);
      pushData = bytecode.slice(bytesIndex + 1, bytesIndex + 1 + length);
    }

    if (sourceMap.location.file !== -1) {
      const file = fileIdToSourceFile.get(sourceMap.location.file)!;

      location = new SourceLocation(
        file,
        sourceMap.location.offset,
        sourceMap.location.length
      );
    }

    const instruction = new Instruction(
      pc,
      opcode,
      jumpType,
      pushData,
      location
    );

    instructions.push(instruction);

    bytesIndex += getOpcodeLength(opcode);
  }

  return instructions;
}

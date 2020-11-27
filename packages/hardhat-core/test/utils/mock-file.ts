import * as path from "path";

import { ResolvedFile } from "../../src/internal/solidity/resolver";

export function mockFile({
  sourceName,
  pragma,
}: {
  sourceName: string;
  pragma: string;
}): ResolvedFile {
  const absolutePath = path.join(process.cwd(), sourceName);

  const content = {
    rawContent: "",
    imports: [],
    versionPragmas: [pragma],
  };

  const lastModificationDate = new Date();

  return new ResolvedFile(
    sourceName,
    absolutePath,
    content,
    "<fake-content-hash>",
    lastModificationDate
  );
}

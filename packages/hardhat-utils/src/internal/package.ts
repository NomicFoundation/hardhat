import { fileURLToPath } from "node:url";

export function getFilePath(filePathOrUrl: string): string {
  if (filePathOrUrl.startsWith("file://")) {
    return fileURLToPath(filePathOrUrl);
  }

  return filePathOrUrl;
}

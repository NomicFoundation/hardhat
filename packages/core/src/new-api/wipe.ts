import path from "path";

import { FileJournal } from "./internal/journal/file-journal";
import { Wiper } from "./internal/wiper";

/**
 * Clear the state against a future within a deployment
 *
 * @param deploymentDir - the file directory of the deployment
 * @param futureId - the future to be cleared
 *
 * @beta
 */
export async function wipe(deploymentDir: string, futureId: string) {
  const fileJournalPath = path.join(deploymentDir, "journal.jsonl");

  const wiper = new Wiper(new FileJournal(fileJournalPath));

  return wiper.wipe(futureId);
}

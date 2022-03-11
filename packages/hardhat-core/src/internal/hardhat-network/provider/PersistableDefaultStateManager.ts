import { DefaultStateManager } from "@ethereumjs/vm/dist/state";

import { Map as ImmutableMap } from "immutable";

import { CheckpointTrie, SecureTrie as Trie } from "merkle-patricia-tree";
import { PersistableStateManager } from "./types/PersistableStateInterface";

export class PersistableDefaultStateManager
  extends DefaultStateManager
  implements PersistableStateManager
{
  public async dumpState(): Promise<ImmutableMap<string, any>> {
    const storage = new Map();
    storage.set("db", await trieDbDump(this._trie));
    storage.set("merkle", await trieDump(this._trie));

    return ImmutableMap(storage);
  }
  public async loadState(state: ImmutableMap<string, any>): Promise<void> {
    await trieDbImport(this._trie, state.get("db"));
    await trieImport(this._trie, state.get("merkle"));
  }
}

function trieDbDump(trie: Trie): Promise<Array<[string, string]>> {
  const dbData: Array<[string, string]> = [];

  return new Promise((resolve) => {
    trie.db._leveldb
      .createReadStream({ keyEncoding: "binary", valueEncoding: "binary" })
      .on("data", async (d: { key: string; value: string }) => {
        dbData.push([
          Buffer.from(d.key, "binary").toString("hex"),
          Buffer.from(d.value, "binary").toString("hex"),
        ]);
      })
      .on("end", () => {
        resolve(dbData);
      });
  });
}

function trieDump(trie: Trie): Promise<Array<[string, string]>> {
  const trieData: Array<[string, string]> = [];
  return new Promise((resolve) => {
    trie
      .createReadStream()
      .on("data", (d: { key: Buffer; value: Buffer }) => {
        trieData.push([d.key.toString("hex"), d.value.toString("hex")]);
      })
      .on("end", () => {
        resolve(trieData);
      });
  });
}

async function trieDbImport(
  trie: Trie,
  data: Array<[string, string]>
): Promise<void> {
  for (const [k, v] of data) {
    await trie.db._leveldb.put(Buffer.from(k, "hex"), Buffer.from(v, "hex"), {
      keyEncoding: "binary",
      valueEncoding: "binary",
    });
  }
}

async function trieImport(
  trie: Trie,
  data: Array<[string, string]>
): Promise<void> {
  for (const [k, v] of data) {
    await CheckpointTrie.prototype.put.call(
      trie,
      Buffer.from(k, "hex"),
      Buffer.from(v, "hex")
    );
  }
}

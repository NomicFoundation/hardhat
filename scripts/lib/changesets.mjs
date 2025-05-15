// @ts-check

import { exec as execSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execSync);

const changesetDir = ".changeset";

/**
 * Read all the changesets that have not yet been applied
 * based on the pre.json file.
 */
export async function readAllNewChangsets() {
  const allChangesetNames = (await readdir(changesetDir))
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.slice(0, -3));

  const alreadyAppliedChangesetNames = JSON.parse(
    (await readFile(path.join(changesetDir, "pre.json"))).toString()
  );

  const newChangesetNames = allChangesetNames.filter(
    (name) => !alreadyAppliedChangesetNames.changesets.includes(name)
  );

  const changesets = [];

  for (const newChangeSetName of newChangesetNames) {
    const changesetFilePath = path.join(changesetDir, `${newChangeSetName}.md`);

    const changesetContent = await readFile(changesetFilePath, "utf-8");

    const { content, frontMatter } = parseFrontMatter(changesetContent);
    const commitHash = await getAddingCommit(changesetFilePath);

    changesets.push({
      frontMatter,
      content,
      path: changesetFilePath,
      commitHash,
    });
  }

  return changesets;
}

function parseFrontMatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontMatter: null, content: markdown };
  }

  return {
    frontMatter: match[1],
    content: match[2],
  };
}

async function getAddingCommit(filePath) {
  try {
    const { stdout } = await exec(
      `git log --diff-filter=A --follow --format=%h -- "${filePath}"`
    );
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

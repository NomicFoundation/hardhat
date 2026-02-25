// @ts-check

import { exec as execSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execSync);

const changesetDir = ".changeset";

/**
 * Read all the changesets.
 */
export async function readAllNewChangsets() {
  const allChangesetNames = (await readdir(changesetDir))
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.slice(0, -3));

  const changesets = [];

  for (const newChangeSetName of allChangesetNames) {
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

export function parseFrontMatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontMatter: null, content: markdown };
  }

  return {
    frontMatter: match[1],
    content: match[2],
  };
}

const DOCS_URL_PATTERN =
  /^#\s*docs:\s*(https?:\/\/github\.com\/NomicFoundation\/hardhat-website\/pull\/\d+)/i;

export function extractDocsUrlsFromFrontMatter(frontMatter) {
  if (frontMatter === null) return [];
  const urls = [];
  for (const line of frontMatter.split("\n")) {
    const match = line.match(DOCS_URL_PATTERN);
    if (match !== null) urls.push(match[1]);
  }
  return urls;
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

// @ts-check

import { readdir, readFile, appendFile } from "node:fs/promises";
import path from "node:path";

import {
  parseFrontMatter,
  extractDocsUrlsFromFrontMatter,
} from "./lib/changesets.mjs";

const changesetDir = ".changeset";

async function collectDocsUrls() {
  if (process.env.GITHUB_OUTPUT === undefined) {
    throw new Error("GITHUB_OUTPUT is not defined");
  }

  const files = (await readdir(changesetDir)).filter(
    (file) => file.endsWith(".md") && file !== "README.md",
  );

  const allUrls = new Set();

  for (const file of files) {
    const content = await readFile(
      path.join(changesetDir, file),
      "utf-8",
    );
    const { frontMatter } = parseFrontMatter(content);
    const urls = extractDocsUrlsFromFrontMatter(frontMatter);
    for (const url of urls) {
      allUrls.add(url);
    }
  }

  const hasDocs = allUrls.size > 0;
  console.log(`has_docs: ${hasDocs}`);
  await appendFile(process.env.GITHUB_OUTPUT, `has_docs=${hasDocs}\n`);

  if (hasDocs) {
    const lines = ["## Documentation PRs to merge"];
    for (const url of allUrls) {
      lines.push(`- ${url}`);
    }
    const commentBody = lines.join("\n");
    console.log(`comment_body:\n${commentBody}`);
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `comment_body<<EOF\n${commentBody}\nEOF\n`,
    );
  }
}

await collectDocsUrls();

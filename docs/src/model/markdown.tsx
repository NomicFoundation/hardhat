import path from "path";
import glob from "glob";
import fs from "fs";
import { execSync } from "child_process";
import { MDXRemoteSerializeResult } from "next-mdx-remote";
import matter from "gray-matter";
import remarkDirective from "remark-directive";
import { serialize } from "next-mdx-remote/serialize";
import { visit } from "unist-util-visit";
import { h } from "hastscript";
import remarkGfm from "remark-gfm";
import remarkUnwrapImages from "remark-unwrap-images";
// @ts-ignore
import rehypePrism from "@mapbox/rehype-prism";

import { DOCS_PATH, REPO_URL, TEMP_PATH } from "../config";

// const rehypePrism = require("@mapbox/rehype-prism");

export const newLineDividerRegEx = /\r\n|\n/;

export const withIndexURL = (pathname: string): string[] => {
  const docPath = pathname.split("/");
  if (docPath[docPath.length - 1] === "index") {
    return [...docPath.slice(0, docPath.length - 1)];
  }
  return docPath;
};

// TODO: check do we need `isIndex`
export const withIndexFile = (docPath: string[], isIndex: boolean): string => {
  const mdFilePath = path.join(
    DOCS_PATH,
    `${docPath.join("/")}${isIndex ? "/index" : ""}.md`
  );
  return mdFilePath;
};

export const withCodeElementWrapper = (
  content: string,
  extension: string = ""
) =>
  `\`\`\`${extension}
${content}
  \`\`\``;

export const getEntriesInfo = (
  line: string
): {
  pathname: string;
  rowsNumbers: [number, number] | null;
} => {
  const rowsNumbers: [number, number] | null = line.includes("{")
    ? (line
        .substring(line.indexOf("{"))
        .replace(/[{}]/g, "")
        .split("-")
        .map((lineNumberString) => Number(lineNumberString)) as [
        number,
        number
      ])
    : null;

  const pathname = (
    rowsNumbers ? line.substring(0, line.indexOf("{")) : line
  ).replace("<<< @/", "");

  return {
    pathname,
    rowsNumbers,
  };
};

export const getContentFromRange = (
  content: string,
  rowsNumbers: [number, number] | null
) => {
  const linesArray = content.split(newLineDividerRegEx);
  const [startLineNumber, endLineNumber] = rowsNumbers || [
    0,
    linesArray.length,
  ];

  return linesArray.slice(startLineNumber, endLineNumber).join("\n");
};

export const readFileContent = (pathname: string) => {
  try {
    return fs.readFileSync(pathname).toString();
  } catch (err) {
    throw new Error(`Cannot read file from: ${pathname}`);
  }
};

export const getFileExtensionFromPathname = (pathname: string) => {
  return pathname.substring(pathname.lastIndexOf(".") + 1);
};

export const withInsertedCodeFromLinks = (content: string) => {
  return content
    .split(newLineDividerRegEx)
    .map((line: string) => {
      if (!line.startsWith("<<<")) return line;

      const { pathname, rowsNumbers } = getEntriesInfo(line);

      const fileContent = readFileContent(pathname);
      const fileExtension = getFileExtensionFromPathname(pathname);

      const contentFromRange = getContentFromRange(fileContent, rowsNumbers);
      return withCodeElementWrapper(contentFromRange, fileExtension);
    })
    .join("\n");
};

export const withoutComments = (content: string) => {
  return content.replace(/<!--[\s\S]*?-->/gm, "");
};

export const readMDFileFromPathOrIndex = (
  fileName: string
): { source: string; fileName: string } => {
  try {
    const source = fs.readFileSync(fileName).toString();
    return {
      source,
      fileName,
    };
  } catch (err) {
    const file = fileName.replace(".md", "/index.md");
    const source = fs.readFileSync(file).toString();
    return {
      source,
      fileName: file,
    };
  }
};

/** @type {import('unified').Plugin<[], import('mdast').Root>} */
function createCustomNodes() {
  // @ts-ignore
  return (tree) => {
    visit(tree, (node) => {
      if (
        node.type === "textDirective" ||
        node.type === "leafDirective" ||
        node.type === "containerDirective"
      ) {
        // eslint-disable-next-line
        const data = node.data || (node.data = {});
        const hast = h(node.name, node.attributes);
        // Create custom nodes from extended MD syntax. E.g. "tip"/"warning"
        // @ts-ignore
        data.hName = hast.tagName;
        // @ts-ignore
        data.hProperties = hast.properties;
      }
    });
  };
}

function addLanguageAndHighlightedLinesToCodeBlocks() {
  // @ts-ignore
  return (tree) => {
    visit(tree, (node) => {
      if (node.type === "code") {
        // eslint-disable-next-line
        const data = node.data || (node.data = {});
        const [lang, highlightedLines] = !node.lang
          ? ["", ""]
          : node.lang.replace("}", "").split("{");

        // @ts-ignore
        data.hProperties = {
          lang,
          highlightedLines,
        };
        // eslint-disable-next-line
        node.lang = lang;
      }
    });
  };
}

export const generateTitleFromContent = (content: string) => {
  return content.split(newLineDividerRegEx)[0].replace(/[#]*/g, "").trim();
};

export const parseMdFile = (source: string) => {
  const { content, data } = matter(source);
  const formattedContent = withoutComments(withInsertedCodeFromLinks(content));

  const tocTitle = data.title ?? generateTitleFromContent(formattedContent);
  const seoTitle = [tocTitle, "Hardhat"].filter(Boolean).join(" | ");
  const seoDescription =
    data.title ||
    "Ethereum development environment for professionals by Nomic Foundation";

  return {
    rawContent: content,
    formattedContent,
    data,
    tocTitle,
    seoTitle,
    seoDescription,
  };
};

export const prepareMdContent = async (
  source: string
): Promise<{
  mdxSource: MDXRemoteSerializeResult;
  data: {
    [key: string]: any;
  };
  seoTitle: string;
  seoDescription: string;
}> => {
  const { formattedContent, ...props } = parseMdFile(source);
  const mdxSource = await serialize(formattedContent, {
    mdxOptions: {
      remarkPlugins: [
        addLanguageAndHighlightedLinesToCodeBlocks,
        remarkGfm,
        remarkDirective,
        createCustomNodes,
        remarkUnwrapImages,
      ],
      rehypePlugins: [rehypePrism],
    },
  });

  return {
    mdxSource,
    ...props,
  };
};

export const getMDFiles = (): string[] =>
  glob
    .sync(`${DOCS_PATH}**/*.md`)
    .filter((pathname) => /\.mdx?$/.test(pathname))
    .map((pathname) => pathname.replace(DOCS_PATH, ""));

export const getPathParamsByFile = (pathname: string): string[] => {
  const fileBase = pathname.replace(/\.mdx?$/, "");
  return withIndexURL(fileBase);
};

export const getHrefByFile = (pathname: string): string => {
  const params = getPathParamsByFile(pathname);
  return path.join(...params);
};

export const getMDPaths = (): Array<{ params: { docPath: string[] } }> =>
  getMDFiles().map((pathname) => ({
    params: {
      docPath: getPathParamsByFile(pathname),
    },
  }));

export const getSidebarConfig = () => {
  try {
    const sidebarConfigPath = `${TEMP_PATH}sidebarConfig.json`;
    const configText = fs.readFileSync(sidebarConfigPath).toString();
    const config = JSON.parse(configText);
    const { layoutConfigs, layoutsMap } = config;
    return { layoutConfigs, layoutsMap };
  } catch (err) {
    console.error(err);
    throw new Error(`Can't read sidebar configs. See the error above`);
  }
};

export const getLayout = (fileName: string) => {
  /**
   * Layout configs is generated from content folder based on .yaml and .md files.
   * The config contains information for all pages at once
   * This happens by executing `createLayouts` function from `getStaticPaths`.
   * In order to optimize build time we store that config in a temporary file
   * (as getStaticPaths and getStaticProps executed in isolated environments, so it's the only way to pass information)
   */
  const { layoutConfigs, layoutsMap } = getSidebarConfig();
  const fileNameKey = fileName.replace(DOCS_PATH, "");
  const { layout, prev = null, next = null } = layoutsMap[fileNameKey];
  return { layout: layoutConfigs[layout], prev, next };
};

export const getCommitDate = (fileName: string): string => {
  const output = execSync(
    `git log -1 --pretty="format:%cI" ${fileName}`
  ).toString();
  return output;
};

export const getEditLink = (fileName: string): string => {
  // https://github.com/NomicFoundation/hardhat/edit/master/docs/hardhat-network/guides/mainnet-forking.md
  return fileName.replace(DOCS_PATH, REPO_URL);
};

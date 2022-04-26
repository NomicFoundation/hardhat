import path from "path";
import glob from "glob";
import fs from "fs";

export const DOCS_PATH = path.join(process.cwd(), "src/content/");
export const newLineDividerRegEx = /\r\n|\n/;

export const withIndexURL = (pathname: string): string[] => {
  const docPath = pathname.split("/");
  if (docPath[docPath.length - 1] === "index") {
    return [...docPath.slice(0, docPath.length - 1)];
  }
  return docPath;
};

export const withIndexFile = (docPath: string[], isIndex: boolean): string => {
  const mdFilePath = path.join(
    DOCS_PATH,
    `${docPath.join("/")}${isIndex ? "/index" : ""}.md`
  );
  return mdFilePath;
};

export const withCodeElementWrapper = (content: string) =>
  `
   \`\`\` 
    ${content}   
    \`\`\`
  `;

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

export const withInsertedCodeFromLinks = (content: string) => {
  return content
    .split(newLineDividerRegEx)
    .map((line: string) => {
      if (!line.startsWith("<<<")) return line;

      const { pathname, rowsNumbers } = getEntriesInfo(line);

      const fileContent = readFileContent(pathname);

      const contentFromRange = getContentFromRange(fileContent, rowsNumbers);
      return withCodeElementWrapper(contentFromRange);
    })
    .join("\n");
};

export const withoutComments = (content: string) => {
  return content.replace(/<!--[\s\S]*?-->/gm, "");
};

export const readMDFileFromPathOrIndex = (pathname: string) => {
  try {
    return fs.readFileSync(pathname);
  } catch (err) {
    return fs.readFileSync(pathname.replace(".md", "/index.md"));
  }
};

export const generateTitleFromContent = (content: string) => {
  return content.split(newLineDividerRegEx)[0].replace(/[#]*/g, "").trim();
};

export const getMDPaths = () =>
  glob
    .sync(`${DOCS_PATH}**/*.md`)
    .filter((pathname) => /\.mdx?$/.test(pathname))
    .map((pathname) => pathname.replace(DOCS_PATH, ""))
    .map((pathname) => pathname.replace(/\.mdx?$/, ""))
    .map((pathname) => ({
      params: {
        docPath: withIndexURL(pathname),
      },
    }));

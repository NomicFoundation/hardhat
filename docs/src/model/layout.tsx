import glob from "glob";
import fs from "fs";
import yaml from "js-yaml";

import {
  getHrefByFile,
  getMDFiles,
  parseMdFile,
  readMDFileFromPathOrIndex,
} from "./markdown";
import { DirInfoConfigKeys, DOCS_PATH, TEMP_PATH } from "../config";
import { getPluginsSubitems } from "./plugins";

import {
  SectionType,
  OrderType,
  DirInfo,
  Layout,
  LayoutsInfo,
  FolderWithFiles,
  FolderInfo,
  FolderType,
  FoldersConfig,
  TocSubitem,
  TocItem,
  FlatTocItem,
  InfoFiles,
} from "./types";

const toCapitalCase = (str: string): string => {
  // @ts-ignore
  const [c, ...rest] = str;
  return `${c.toUpperCase()}${rest.join("")}`;
};

const getDefaultConfig = (folder: FolderInfo): DirInfo => {
  const config = {
    [DirInfoConfigKeys.SECTION_TYPE]: SectionType.GROUP,
    [DirInfoConfigKeys.SECTION_TITLE]: toCapitalCase(folder.path),
    order: folder.files.map(({ file }) =>
      file.replace(/\.mdx?$/, "").replace(new RegExp(`^${folder.path}`), "")
    ),
  };

  return config;
};

const getLayoutsInfo = (): LayoutsInfo => {
  const fullPath = `${DOCS_PATH}/layouts.yaml`;
  const yamlText = fs.readFileSync(fullPath).toString();
  const yamlData = yaml.load(yamlText) as LayoutsInfo;
  return yamlData;
};

export const getDirInfoFiles = (): InfoFiles =>
  glob
    .sync(`${DOCS_PATH}**/_dirinfo.yaml`)
    .filter((pathname) => /\.yaml$/.test(pathname))
    .map((pathname) => pathname.replace(DOCS_PATH, ""))
    .map((pathname) => ({
      path: pathname,
    }));

export const getYamlData = (relativePath: string): DirInfo => {
  const fullPath = `${DOCS_PATH}/${relativePath}`;
  const yamlText = fs.readFileSync(fullPath).toString();
  const yamlData = yaml.load(yamlText) as DirInfo;
  return yamlData;
};

export const getFoldersInfo = (infoFiles: InfoFiles): FoldersConfig =>
  infoFiles.map(({ path }) => ({
    path,
    folder: path.replace("/_dirinfo.yaml", ""),
    config: getYamlData(path),
  }));

export const getAllFolders = (mdFiles: string[]): FolderWithFiles[] => {
  const filesWithPaths = mdFiles.map((fileName) => ({
    fileName,
    path: fileName.replace(/\/.*\.mdx?$/, ""),
  }));
  // @ts-ignore
  const allPaths = [...new Set(filesWithPaths.map(({ path }) => path))];
  const folders = allPaths.map((path) => ({
    path,
    files: filesWithPaths
      .filter((fl) => fl.path === path)
      .map(({ fileName }) => fileName),
  }));

  return folders;
};

const matchFoldersToLayouts = (
  folders: FolderWithFiles[],
  layouts: LayoutsInfo,
  foldersInfo: FoldersConfig
): Array<FolderInfo & { layout: Layout }> => {
  const layoutsList = Object.entries(layouts).map(([layoutKey, lt]) => ({
    layoutKey,
    ...lt,
  }));

  const allFolderPaths = new Set([
    ...folders.map(({ path }) => path),
    ...foldersInfo.map(({ folder }) => folder),
  ]);

  // @ts-ignore
  return [...allFolderPaths].map((path) => {
    const lt = layoutsList.find(({ folders: ff }) => ff.includes(path));
    if (!lt) {
      throw new Error(
        `Folder ${path} isn't included to any layout. Please specify it in ${DOCS_PATH}/layouts.yaml file. If you don't want to list it in the sidebar, use "section-type: hidden" in _dirinfo.yaml`
      );
    }
    const fld = folders.find((f) => f.path === path);
    const fldInfo = foldersInfo.find((f) => f.folder === path);
    if (
      fldInfo &&
      fldInfo.config[DirInfoConfigKeys.SECTION_TYPE] === SectionType.PLUGINS
    ) {
      const virtualFiles = fldInfo?.config?.order?.map((file: string | {}) => {
        if (typeof file === "object") {
          return file;
        }
        return {
          file,
          href: file,
        };
      });

      return {
        path,
        files: virtualFiles,
        layout: lt,
        [DirInfoConfigKeys.SECTION_TYPE]: SectionType.PLUGINS,
      };
    }
    const files =
      fld?.files?.map((file) => ({ file, href: getHrefByFile(file) })) || null;
    return {
      path,
      files,
      layout: lt,
      [DirInfoConfigKeys.SECTION_TYPE]: fldInfo?.config
        ? fldInfo?.config[DirInfoConfigKeys.SECTION_TYPE]
        : undefined,
    };
  });
};

const getSubitems = (path: string, order: OrderType[]): TocSubitem[] => {
  const items = order.map((item) => {
    if (typeof item === "object") {
      return {
        label: item.title,
        href: `/${path}${item.href}`,
      };
    }

    const fullName = `${path}${item}.md`;
    const { source } = readMDFileFromPathOrIndex(`${DOCS_PATH}${fullName}`);

    const { tocTitle } = parseMdFile(source);

    return {
      href: `/${path}${item}`,
      label: tocTitle || item,
    };
  });
  return items;
};

const generateGroupSection = (folder: FolderType) => {
  const tocItem = {
    label: folder[DirInfoConfigKeys.SECTION_TITLE],
    type: folder[DirInfoConfigKeys.SECTION_TYPE],
    children: folder.order?.length
      ? getSubitems(folder.path, folder.order)
      : undefined,
  };

  return tocItem;
};

const generateSingleSection = (folder: FolderType) => {
  const tocItem = {
    label: folder[DirInfoConfigKeys.SECTION_TITLE],
    href: folder[DirInfoConfigKeys.SECTION_URL] ?? `/${folder.path}`,
    type: folder[DirInfoConfigKeys.SECTION_TYPE],
    children: folder.order?.length
      ? getSubitems(folder.path, folder.order)
      : undefined,
  };

  return tocItem;
};

const generateHiddenSection = () => null;

const generatePluginsSection = (folder: FolderType) => {
  const tocItem = {
    label:
      folder[DirInfoConfigKeys.SECTION_TITLE] || toCapitalCase(folder.path),
    type: folder[DirInfoConfigKeys.SECTION_TYPE],
    children: getPluginsSubitems(folder.path, folder.order),
  };

  return tocItem;
};

const sectionTypeGeneratorsMap = {
  [SectionType.GROUP]: generateGroupSection,
  [SectionType.SINGLE]: generateSingleSection,
  [SectionType.HIDDEN]: generateHiddenSection,
  [SectionType.PLUGINS]: generatePluginsSection,
};

const generateTocItem = (fld: null | FolderType): TocItem | null => {
  if (!fld) {
    return null;
  }
  const sectionType = fld[DirInfoConfigKeys.SECTION_TYPE] as
    | SectionType
    | string;
  // @ts-ignore
  const sectionGenerator = sectionTypeGeneratorsMap[sectionType];

  if (!sectionGenerator) {
    throw new Error(`wrong section-type - ${sectionType} (see ${fld.path})`);
  }

  return sectionGenerator(fld);
};

const getItemByHref =
  (flatTocList: FlatTocItem[]) =>
  (
    href: string,
    needSkipSearch: boolean
  ):
    | {
        prev: TocSubitem;
        next: TocSubitem;
      }
    | {} => {
    if (needSkipSearch) {
      return {};
    }
    const items = flatTocList.filter((item) => {
      if (!item?.href) {
        return false;
      }
      const itemHref = item.href.replace(/#.*$/, "").replace(/\/$/, "");
      return itemHref === href;
    });
    if (!items.length) {
      // throw new Error(`Can't find menu entry for ${href} URL`);
      return {};
    }
    const first = items[0] as FlatTocItem;
    const last = items[items.length - 1] as FlatTocItem;
    return {
      prev: first.prev,
      next: last.next,
    };
  };

const getPluginsItems = (
  layoutNavigations: FlatTocItem[],
  folder: FolderInfo & {
    layout: Layout;
  }
): Array<FlatTocItem & { file: string }> => {
  const pluginItems = layoutNavigations.filter(({ href }) =>
    /\/plugins/.test(href)
  );

  return pluginItems.map((item) => ({
    ...item,
    file: item.label,
    folder: folder.path,
    layout: folder.layout.layoutKey,
  }));
};

const getLayoutToc = (
  layout: Layout,
  foldersStructure: Array<{
    path: string;
    files: Array<{
      file: string;
      href: string;
    }>;
    layout: Layout;
  }>
): { tocItems: TocItem[]; flatTocList: FlatTocItem[] } => {
  const tocItems = layout.folders
    .map((fldName: string) => {
      const fld = foldersStructure.find(
        ({ path }: { path: string }) => path === fldName
      );
      return fld;
    })
    // @ts-ignore
    .map(generateTocItem)
    .filter(Boolean) as TocItem[];

  const flatTocList = tocItems
    .flatMap((item: TocItem | TocSubitem) => {
      if ((item as TocItem).children) {
        return (item as TocItem).children;
      }
      return [item];
    })
    .map((item, index, list) => {
      const prev = index > 0 ? list[index - 1] : null;
      const next = index < list.length - 1 ? list[index + 1] : null;
      return {
        ...item,
        prev,
        next,
      };
    }) as FlatTocItem[];

  return { tocItems, flatTocList };
};

export const createLayouts = () => {
  const infoFiles = getDirInfoFiles();
  const foldersInfo = getFoldersInfo(infoFiles);
  const mdFiles = getMDFiles();
  const folders = getAllFolders(mdFiles);

  const layouts = getLayoutsInfo();

  const foldersWithLayouts = matchFoldersToLayouts(
    folders,
    layouts,
    foldersInfo
  );
  const foldersStructure = foldersWithLayouts.map((fld) => ({
    ...fld,
    ...(foldersInfo.find(({ folder }) => folder === fld.path)?.config ||
      getDefaultConfig(fld)),
  }));

  const layoutConfigAndNavigation = Object.entries(layouts).map(([key, l]) => {
    const layoutToc = getLayoutToc(l, foldersStructure);
    return {
      config: {
        [key]: layoutToc.tocItems,
      },
      navigation: layoutToc.flatTocList,
    };
  });

  const layoutConfigs = layoutConfigAndNavigation.reduce(
    (acc, obj) => ({
      ...acc,
      ...obj.config,
    }),
    {}
  );

  const layoutNavigations = layoutConfigAndNavigation.flatMap(
    (l) => l.navigation
  );

  const getNavigation = getItemByHref(layoutNavigations);

  const layoutsMap = foldersWithLayouts
    .map((folder) =>
      folder.files
        ?.map((fileEntry) => {
          if (folder[DirInfoConfigKeys.SECTION_TYPE] === SectionType.PLUGINS) {
            const pluginItems = getPluginsItems(layoutNavigations, folder);
            return pluginItems;
          }
          // @ts-ignore
          const { prev, next } = getNavigation(
            `/${fileEntry.href}`,
            folder[DirInfoConfigKeys.SECTION_TYPE] === SectionType.HIDDEN
          );
          return [
            {
              file: fileEntry.file,
              href: fileEntry.href,
              folder: folder.path,
              layout: folder.layout.layoutKey,
              prev,
              next,
            },
          ];
        })
        .flat()
    )
    .filter(Boolean)
    .flat()
    .reduce(
      (acc, obj) => ({
        ...acc,
        [obj.file]: obj,
      }),
      {}
    );

  /**
   * We are generating this config once per build from `getStaticPaths`.
   * After that we are writing the config to a temporary file for reusing this data from `getStaticProps` on page generations.
   * So each single page doesn't need to execute this function again
   */
  const sidebarConfigPath = `${TEMP_PATH}sidebarConfig.json`;
  fs.writeFileSync(
    sidebarConfigPath,
    JSON.stringify({ layoutConfigs, layoutsMap })
  );
};

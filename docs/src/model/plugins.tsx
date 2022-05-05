import path from "path";

import { getSidebarConfig, readFileContent } from "./markdown";
import { OrderType, SectionType, TocItem, TocSubitem } from "./types";

/**
 * NOTE: here we assumes that "Plugins" menu items only belongs to ${PLUGINS_LAYOUT} layout.
 * This means the information for generating static pages will be found in this layout from a section
 * with section-type == plugin (section is a folder in content)
 * We also assume that only one section with plugins exists
 * Additionally we hardcode plugins pages path to `/pages/plugins/...`
 *
 * If you ever need to extend this behavior see `getPluginsPaths` function.
 * e.g. for adding a plugin section to another layout start reading `content/layouts.yaml`
 * as a source of actual layouts configuration
 */
const PLUGINS_LAYOUT = "documentation";

export const generateSlug = (pluginName: string): string =>
  pluginName.replace(/^@/, "").replace(/\//g, "-");

export const getPluginsSubitems = (
  folderPath: string,
  order: OrderType[]
): TocSubitem[] => {
  return order.map((item: OrderType) => {
    if (typeof item === "object") {
      return {
        label: item.title,
        href: item.href,
      };
    }
    return {
      label: item,
      href: `/${folderPath}/${generateSlug(item)}`,
    };
  });
};

export const getPluginsPaths = (): Array<{ params: { plugin: string } }> => {
  try {
    const { layoutConfigs } = getSidebarConfig();
    const config = layoutConfigs[PLUGINS_LAYOUT] as TocItem[];
    const pluginsSection = config.find(
      ({ type }) => type === SectionType.PLUGINS
    );
    if (!pluginsSection?.children) {
      throw new Error(
        `Section with type=plugins is missed or empty. Check content/plugins/_dirinfo.yaml`
      );
    }
    return pluginsSection.children
      .map(({ href }) => href.replace(/^\/plugins\//, ""))
      .filter((slug) => slug[0] !== "#")
      .map((slug) => ({
        params: {
          plugin: slug,
        },
      }));
  } catch (err) {
    console.error(err);
    throw new Error(
      `Error while generation plugin page paths. See details above`
    );
  }
};

const getPluginReadmeFilename = (pluginSlug: string): string => {
  const folderName = pluginSlug.replace(/nomiclabs-/, "");
  const rootPath = process.cwd().toString();
  const filename = path.join(rootPath, "../packages/", folderName, "README.md");
  return filename;
};

export const getPluginMDSource = (pluginSlug: string) => {
  const readmeFilename = getPluginReadmeFilename(pluginSlug);
  const source = readFileContent(readmeFilename).toString();
  return source;
};

import path from "path";
import { request } from "undici";
import { getSidebarConfig, readFileContent } from "./markdown";
import { IPlugin, OrderType, SectionType, TocItem, TocSubitem } from "./types";
import plugins from "../content/hardhat-runner/plugins/plugins";

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
const PLUGINS_LAYOUT = "hardhat-runner";

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
        `Section with type=plugins is missed or empty. Check content/hardhat-runner/plugins/_dirinfo.yaml`
      );
    }
    return pluginsSection.children
      .map(({ href }) => href.replace(/^\/hardhat-runner\/plugins\//, ""))
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
  const folderName = pluginSlug
    .replace("hardhat-runner/plugins/", "")
    .replace(/nomiclabs-/, "")
    .replace(/nomicfoundation-/, "");
  const rootPath = process.cwd().toString();
  const filename = path.join(rootPath, "../packages/", folderName, "README.md");
  return filename;
};

export const getPluginMDSource = (pluginSlug: string) => {
  const readmeFilename = getPluginReadmeFilename(pluginSlug);
  const source = readFileContent(readmeFilename).toString();
  return source;
};

export const sortPluginsByDownloads = (downloadsD: {
  [key: string]: number;
}) => {
  try {
    plugins.communityPlugins.sort(
      (p1: IPlugin, p2: IPlugin) => downloadsD[p2.name] - downloadsD[p1.name]
    );
  } catch {
    // we just don't sort here
  }
};

const getLastMonthDownloads = async (npmPackage: string): Promise<number> => {
  const res = await request(
    `https://api.npmjs.org/downloads/point/last-month/${npmPackage}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );

  if (res.statusCode === 404) {
    return 0;
  }

  const json = (await res.body.json()) as { downloads: number };

  return json.downloads;
};

export const generatePluginsDownloads = async (pluginsD: typeof plugins) => {
  const downloads: Array<{ [plugin: string]: number }> = await Promise.all(
    pluginsD.communityPlugins.map(async (p: any) => ({
      [p.name]: await getLastMonthDownloads(p.npmPackage ?? p.name),
    }))
  );

  downloads.sort((p1, p2) => Object.values(p2)[0] - Object.values(p1)[0]);

  const result = Object.assign({}, ...downloads);
  return result;
};

export const addNormalizedName = (pluginsList: IPlugin[]) => {
  return pluginsList.map((p) => ({
    ...p,
    normalizedName: p.name.split("/").join("-").replace(/^@/, ""),
  }));
};

export const getPlugins = async () => {
  const generatedPluginsDownloads = await generatePluginsDownloads(plugins);
  sortPluginsByDownloads(generatedPluginsDownloads);
  plugins.officialPlugins = addNormalizedName(plugins.officialPlugins);
  return plugins;
};

export type PluginsList = typeof plugins;

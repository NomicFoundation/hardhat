import { DirInfoConfigKeys, LayoutsConfigKeys } from "../config";

export enum SectionType {
  SINGLE = "single",
  GROUP = "group",
  HIDDEN = "hidden",
  PLUGINS = "plugins",
}

export type OrderType =
  | string
  | {
      href: string;
      title: string;
    };

export interface DirInfo {
  [DirInfoConfigKeys.SECTION_TYPE]: SectionType;
  [DirInfoConfigKeys.SECTION_TITLE]: string;
  [DirInfoConfigKeys.ORDER]: OrderType[];
}

export interface Layout {
  [LayoutsConfigKeys.TITLE]: string;
  [LayoutsConfigKeys.FOLDERS]: string[];
  layoutKey?: string;
}

export interface LayoutsInfo {
  [layoutKey: string]: Layout;
}

export interface FolderWithFiles {
  path: string;
  files: string[];
}

export interface FolderInfo {
  path: string;
  files: Array<{ file: string; href: string }>;
  [DirInfoConfigKeys.SECTION_TYPE]: SectionType;
}

export interface FolderType {
  [DirInfoConfigKeys.SECTION_TYPE]: SectionType;
  [DirInfoConfigKeys.SECTION_TITLE]: string;
  [DirInfoConfigKeys.SECTION_URL]: string | undefined;
  [DirInfoConfigKeys.ORDER]: OrderType[];
  path: string;
}

export type FoldersConfig = Array<{
  path: string;
  folder: string;
  config: {
    [key: string]: any;
  };
}>;

export interface TocSubitem {
  label: string;
  href: string;
  type?: SectionType;
  next?: TocSubitem;
  prev?: TocSubitem;
}

export interface TocItem {
  label: string;
  type: SectionType;
  href?: string;
  children?: TocSubitem[];
  // next?: TocSubitem;
  // prev?: TocSubitem;
}

export interface FlatTocItem {
  label: string;
  href: string;
  next?: TocSubitem;
  prev?: TocSubitem;
}

export type InfoFiles = Array<{ path: string }>;

export interface IFrontMatter {
  seoTitle: string;
  seoDescription: string;
}

export interface IPlugin {
  name: string;
  npmPackage?: string;
  author: string;
  authorUrl: string;
  description: string;
  tags: string[];
  normalizedName?: string;
}

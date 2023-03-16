export interface ISeo {
  title: string;
  description: string;
}

interface IDocumentationSidebarSectionChild {
  label: string;
  href: string;
}
interface IDocumentationSidebarSection {
  label: string;
  href?: string;
  type: "single" | "group";
  children?: IDocumentationSidebarSectionChild[];
}

export interface NavOption {
  href: string;
  label: string;
}

export interface FooterNavigation {
  next?: NavOption | false;
  prev?: NavOption | false;
  lastEditDate: string;
  editLink: string;
}

export type IDocumentationSidebarStructure = IDocumentationSidebarSection[];

export interface IFooterNavigation {
  href: string;
  label: string;
}

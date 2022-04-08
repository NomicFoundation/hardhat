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
  type: "default" | "group";
  children?: IDocumentationSidebarSectionChild[];
}

export type IDocumentationSidebarStructure = IDocumentationSidebarSection[];

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
  next?: NavOption;
  prev?: NavOption;
}

// TODO: Check do we need this type for UI components. If not - remove it.
export type IDocumentationSidebarStructure = IDocumentationSidebarSection[];

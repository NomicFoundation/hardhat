import React, { useState } from "react";
import { menuItemsList, socialsItems } from "../config";
import DocumentationSidebarStructure from "./Navigation.mocks.json";
import MobileSidebarMenu from "./MobileSidebarMenu";

import DocumentationNavigation from "./Navigation";
import Sidebar from "./Sidebar";
import { IDocumentationSidebarStructure } from "./types";

export default {
  title: "Documentation/ Navigation",
};

export const MobileSidebar = () => (
  <MobileSidebarMenu
    menuItems={menuItemsList}
    socialsItems={socialsItems}
    sidebarElementsList={
      DocumentationSidebarStructure as IDocumentationSidebarStructure
    }
  />
);

export const SidebarMenu = () => (
  <Sidebar
    elementsList={
      DocumentationSidebarStructure as IDocumentationSidebarStructure
    }
  />
);

export const Navigation = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return (
    <DocumentationNavigation
      isSidebarOpen={isSidebarOpen}
      onSidebarOpen={setIsSidebarOpen}
    />
  );
};

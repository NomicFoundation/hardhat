import React, { useState } from "react";
import {
  menuItemsList,
  DocumentationSidebarStructure,
  socialsItems,
} from "../config";
import MobileSidebarMenu from "./MobileSidebarMenu";

import DocumentationNavigation from "./Navigation";
import Sidebar from "./Sidebar";

export default {
  title: "Documentation/ Navigation",
};

export const MobileSidebar = () => (
  <MobileSidebarMenu
    menuItems={menuItemsList}
    socialsItems={socialsItems}
    sidebarElementsList={DocumentationSidebarStructure}
  />
);

export const SidebarMenu = () => (
  <Sidebar elementsList={DocumentationSidebarStructure} />
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

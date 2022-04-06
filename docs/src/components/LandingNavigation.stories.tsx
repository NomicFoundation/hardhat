import React from "react";

import DesktopMenu from "./ui/DesktopMenu";
import MobileMenu from "./ui/MobileMenu";
import LandingNavigation from "./LandingNavigation";
import { menuItemsList, socialsItems } from "../config";

export default {
  title: "Common/Landing Navigation",
};

export const Desktop = () => (
  <DesktopMenu socialsItems={socialsItems} menuItems={menuItemsList} />
);
export const Mobile = () => (
  <MobileMenu socialsItems={socialsItems} isOpen menuItems={menuItemsList} />
);
export const Navigation = () => <LandingNavigation />;

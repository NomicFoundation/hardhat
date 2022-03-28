import React from "react";

import DesktopMenu from "./ui/DesktopMenu";
import MobileMenu from "./ui/MobileMenu";
import LandingNavigation from "./LandingNavigation";
import { defaultMenuItemsList } from "../config";

export default {
  title: "Common/Landing Navigation",
};

export const Desktop = () => <DesktopMenu menuItems={defaultMenuItemsList} />;
export const Mobile = () => (
  <MobileMenu isOpen menuItems={defaultMenuItemsList} />
);
export const Navigation = () => <LandingNavigation />;

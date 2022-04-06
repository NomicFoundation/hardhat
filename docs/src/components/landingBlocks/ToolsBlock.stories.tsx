import React from "react";

import homepageContent from "../../content/home";
import ToolsBlock from "./ToolsBlock";

export default {
  title: "Landing Blocks/Hero",
};

export const Default = () => (
  <ToolsBlock content={homepageContent.toolsBlockContent} />
);

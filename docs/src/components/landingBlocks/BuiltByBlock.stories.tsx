import React from "react";

import BuiltByBlock from "./BuiltByBlock";
import homepageContent from "../../content/home";

export default {
  title: "Landing Blocks/Built by",
};

export const Default = () => (
  <BuiltByBlock content={homepageContent.builtByBlockContent} />
);

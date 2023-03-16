import React from "react";

import homepageContent from "../../content/home";
import GetStartedBlock from "./GetStartedBlock";

export default {
  title: "Landing Blocks/Get Started",
};

export const Default = () => (
  <GetStartedBlock content={homepageContent.getStartedBlockContent} />
);

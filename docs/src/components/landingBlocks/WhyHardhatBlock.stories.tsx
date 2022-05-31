import React from "react";

import homepageContent from "../../content/home";
import WhyHardhatBlock from "./WhyHardhatBlock";

export default {
  title: "Landing Blocks/Why Hardhat",
};

export const Default = () => (
  <WhyHardhatBlock content={homepageContent.whyHardhatContent} />
);

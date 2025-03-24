import React from "react";

import homepageContent from "../../content/home";
import WhatIsNewBlock from "./WhatIsNewBlock";

export default {
  title: "Landing Blocks/What’s new in Hardhat",
};

export const Default = () => (
  <WhatIsNewBlock content={homepageContent.whatIsNewBlockContent} />
);

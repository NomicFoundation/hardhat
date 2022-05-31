import React from "react";

import VibrantCommunityBlock from "./VibrantCommunityBlock";
import homepageContent from "../../content/home";

export default {
  title: "Landing Blocks/Vibrant community",
};

export const Default = () => (
  <VibrantCommunityBlock
    content={homepageContent.vibrantCommunityBlockContent}
  />
);

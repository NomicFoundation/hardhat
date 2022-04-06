import React from "react";
import defaultProps from "../ui/default-props";
import ReviewsBlock from "./ReviewsBlock";

const { defaultReviewsBlockContent } = defaultProps;

export default {
  title: "Landing Blocks/Hero",
};

export const Default = () => (
  <ReviewsBlock content={defaultReviewsBlockContent} />
);

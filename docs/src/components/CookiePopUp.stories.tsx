import React from "react";

import CookiePopUp from "./CookiePopUp";
import homepageContent from "../content/home";

export default {
  title: "Common/Cookies",
};

export const Cookie = () => (
  <CookiePopUp
    content={homepageContent.cookiePopUp}
    closePopUp={() => {
      // eslint-disable-next-line
      return console.log("cookie pop up closed");
    }}
  />
);

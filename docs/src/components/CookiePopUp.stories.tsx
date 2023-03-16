import React from "react";

import CookiePopUp from "./CookiePopUp";
import { GDPR } from "../config";

export default {
  title: "Common/Cookies",
};

export const Cookie = () => (
  <CookiePopUp {...GDPR} onAccept={() => null} onReject={() => null} />
);

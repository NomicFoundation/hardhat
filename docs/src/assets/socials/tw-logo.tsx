import * as React from "react";
import { SVGProps, memo } from "react";

const TwitterLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M16.1758 5.4375H18.4023L13.538 10.9971L19.2605 18.5625H14.7798L11.2704 13.9741L7.25485 18.5625H5.02697L10.2298 12.6159L4.74023 5.4375H9.33466L12.5069 9.63144L16.1758 5.4375ZM15.3944 17.2298H16.6281L8.66427 6.70019H7.34033L15.3944 17.2298Z" />
  </svg>
);

export default memo(TwitterLogo);

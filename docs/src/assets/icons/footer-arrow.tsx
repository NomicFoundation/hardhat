import * as React from "react";
import { SVGProps } from "react";

const FooterArrow = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={16}
    height={17}
    viewBox="0 0 16 17"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M9 3.00488L14 8.00488L9 13.0049"
      stroke="#C4C4C4"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2 7.25488C1.58579 7.25488 1.25 7.59067 1.25 8.00488C1.25 8.4191 1.58579 8.75488 2 8.75488L2 7.25488ZM14 7.25488L2 7.25488L2 8.75488L14 8.75488L14 7.25488Z"
      fill="#C4C4C4"
    />
  </svg>
);

export default FooterArrow;

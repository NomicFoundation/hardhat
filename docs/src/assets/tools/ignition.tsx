import * as React from "react";
import { SVGProps, memo } from "react";

const IgnitionIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={42}
    height={42}
    viewBox="0 0 42 42"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect
      x={10}
      y={20}
      width={23}
      height={22}
      fill="url(#paint0_linear_2791_14068)"
    />
    <g
      style={{
        mixBlendMode: "multiply",
      }}
    >
      <path
        d="M4.75 21C4.33578 21 3.99832 20.664 4.01606 20.2502C4.10364 18.2081 4.54841 16.195 5.3321 14.303C6.21156 12.1798 7.50061 10.2507 9.12563 8.62563C10.7507 7.0006 12.6798 5.71156 14.803 4.83211C16.9262 3.95265 19.2019 3.5 21.5 3.5C23.7981 3.5 26.0738 3.95265 28.197 4.83211C30.3202 5.71156 32.2493 7.00061 33.8744 8.62563C35.4994 10.2507 36.7884 12.1798 37.6679 14.303C38.4516 16.195 38.8964 18.2081 38.9839 20.2502C39.0017 20.664 38.6642 21 38.25 21L21.5 21L4.75 21Z"
        fill="url(#paint1_linear_2791_14068)"
      />
    </g>
    <path
      d="M11 20.9999C11 19.6867 11.2716 18.3863 11.7993 17.173C12.3269 15.9598 13.1004 14.8574 14.0754 13.9288C15.0504 13.0002 16.2079 12.2636 17.4818 11.7611C18.7557 11.2585 20.1211 10.9999 21.5 10.9999C22.8789 10.9999 24.2443 11.2585 25.5182 11.7611C26.7921 12.2636 27.9496 13.0002 28.9246 13.9288C29.8996 14.8574 30.6731 15.9598 31.2007 17.173C31.7284 18.3863 32 19.6867 32 20.9999L11 20.9999Z"
      fill="#FFF100"
    />
    <path
      d="M11 21L11.7803 20.2197C11.921 20.079 12.1117 20 12.3107 20H30.6893C30.8883 20 31.079 20.079 31.2197 20.2197L32 21L27.8842 34.4888C27.6861 35.138 26.7964 35.2112 26.4949 34.6031L25.7704 33.142C25.4785 32.5533 24.6245 32.5979 24.3955 33.2138L22.203 39.1097C21.9607 39.7611 21.0393 39.7611 20.797 39.1097L18.6045 33.2138C18.3755 32.5979 17.5215 32.5533 17.2296 33.142L16.5051 34.6031C16.2036 35.2112 15.3139 35.138 15.1158 34.4888L11 21Z"
      fill="url(#paint2_linear_2791_14068)"
    />
    <defs>
      <linearGradient
        id="paint0_linear_2791_14068"
        x1={10}
        y1={20}
        x2={9.48266}
        y2={41.6518}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#EEE3FF" />
        <stop offset={1} stopColor="#FBFCDB" />
        <stop offset={1} stopColor="#FBFCDB" />
      </linearGradient>
      <linearGradient
        id="paint1_linear_2791_14068"
        x1={18.8272}
        y1={12.4409}
        x2={29.1148}
        y2={0.621173}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#4F00A3" />
        <stop offset={1} stopColor="#23004E" />
      </linearGradient>
      <linearGradient
        id="paint2_linear_2791_14068"
        x1={13.9166}
        y1={22.1765}
        x2={11.9839}
        y2={33.7223}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FFF100" />
        <stop offset={1} stopColor="#EDCF00" />
      </linearGradient>
    </defs>
  </svg>
);

export default memo(IgnitionIcon);

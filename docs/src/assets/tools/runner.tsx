import * as React from "react";
import { SVGProps, memo } from "react";

const RunnerIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={42}
    height={42}
    viewBox="0 0 42 42"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g clipPath="url(#clip0_2572_132866)">
      <rect
        x={3}
        y={24}
        width={18}
        height={14.25}
        rx={0.75}
        fill="url(#paint0_linear_2572_132866)"
      />
      <rect
        x={4.5}
        y={6.75}
        width={30.75}
        height={18}
        rx={0.75}
        fill="url(#paint1_linear_2572_132866)"
      />
      <path
        d="M20.4904 14.799C20.4904 14.2217 21.1154 13.8608 21.6154 14.1495L41.8654 25.8409C42.3654 26.1295 42.3654 26.8512 41.8654 27.1399L21.6154 38.8312C21.1154 39.1199 20.4904 38.7591 20.4904 38.1817L20.4904 14.799Z"
        fill="url(#paint2_linear_2572_132866)"
      />
    </g>
    <defs>
      <linearGradient
        id="paint0_linear_2572_132866"
        x1={21}
        y1={24}
        x2={0.522415}
        y2={31.3002}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#EEE3FF" />
        <stop offset={1} stopColor="#FBFCDB" />
        <stop offset={1} stopColor="#FBFCDB" />
      </linearGradient>
      <linearGradient
        id="paint1_linear_2572_132866"
        x1={33.3829}
        y1={10.4763}
        x2={16.8823}
        y2={14.8446}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#4F00A3" />
        <stop offset={1} stopColor="#23004E" />
      </linearGradient>
      <linearGradient
        id="paint2_linear_2572_132866"
        x1={28.7418}
        y1={8.73605}
        x2={7.45588}
        y2={21.1177}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FFF100" />
        <stop offset={1} stopColor="#EDCF00" />
      </linearGradient>
      <clipPath id="clip0_2572_132866">
        <rect width={42} height={42} fill="white" />
      </clipPath>
    </defs>
  </svg>
);

export default memo(RunnerIcon);

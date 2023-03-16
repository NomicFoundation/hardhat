import * as React from "react";
import { SVGProps } from "react";

const RunnerIconDark = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={42}
    height={42}
    viewBox="0 0 42 42"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g clipPath="url(#clip0_5562_16676)">
      <g
        style={{
          mixBlendMode: "screen",
        }}
      >
        <rect x={3} y={24} width={18} height={14.25} rx={0.75} fill="white" />
        <rect
          x={3}
          y={24}
          width={18}
          height={14.25}
          rx={0.75}
          fill="url(#paint0_linear_5562_16676)"
        />
      </g>
      <rect
        x={4.5}
        y={6.75}
        width={30.75}
        height={18}
        rx={0.75}
        fill="url(#paint1_linear_5562_16676)"
      />
      <path
        d="M20.4904 14.799C20.4904 14.2217 21.1154 13.8608 21.6154 14.1495L41.8654 25.8409C42.3654 26.1295 42.3654 26.8512 41.8654 27.1399L21.6154 38.8312C21.1154 39.1199 20.4904 38.7591 20.4904 38.1817L20.4904 14.799Z"
        fill="url(#paint2_linear_5562_16676)"
      />
    </g>
    <defs>
      <linearGradient
        id="paint0_linear_5562_16676"
        x1={12.1697}
        y1={21.1359}
        x2={12.3643}
        y2={42.3572}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#14181E" />
        <stop offset={1} stopColor="#20232A" />
      </linearGradient>
      <linearGradient
        id="paint1_linear_5562_16676"
        x1={4.50044}
        y1={18.1378}
        x2={34.6391}
        y2={18.1378}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#6B37A9" />
        <stop offset={1} stopColor="#AC64FF" />
      </linearGradient>
      <linearGradient
        id="paint2_linear_5562_16676"
        x1={28.7418}
        y1={8.73605}
        x2={7.45588}
        y2={21.1177}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FFF100" />
        <stop offset={1} stopColor="#EDCF00" />
      </linearGradient>
      <clipPath id="clip0_5562_16676">
        <rect width={42} height={42} fill="white" />
      </clipPath>
    </defs>
  </svg>
);

export default RunnerIconDark;

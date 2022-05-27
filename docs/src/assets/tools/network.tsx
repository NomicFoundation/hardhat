import * as React from "react";
import { SVGProps, memo } from "react";

const NetworkIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={42}
    height={42}
    viewBox="0 0 42 42"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g clipPath="url(#clip0_2572_133034)">
      <path
        d="M12.5017 7.64481C11.5121 7.23334 10.3781 7.3811 9.52689 8.03244C8.67571 8.68377 8.23667 9.73973 8.37516 10.8025L11.0607 31.4129C11.1992 32.4757 11.8942 33.3839 12.8838 33.7954C13.8735 34.2069 15.0075 34.0591 15.8587 33.4078L32.365 20.7768C33.2162 20.1255 33.6552 19.0695 33.5167 18.0067C33.3783 16.9439 32.6833 16.0357 31.6936 15.6243L12.5017 7.64481Z"
        fill="url(#paint0_linear_2572_133034)"
        stroke="url(#paint1_linear_2572_133034)"
        strokeWidth={6}
        strokeLinejoin="round"
      />
      <path
        d="M9.65643 12.0247L31.5241 15.1058L17.9219 32.5032L9.65643 12.0247Z"
        fill="url(#paint2_linear_2572_133034)"
      />
      <ellipse
        cx={13.5}
        cy={33}
        rx={8.25}
        ry={8.25}
        fill="url(#paint3_linear_2572_133034)"
      />
      <ellipse
        rx={5.25}
        ry={5.25}
        transform="matrix(1 0 0 -1 8.25 7.5)"
        fill="url(#paint4_linear_2572_133034)"
      />
      <ellipse
        rx={6.75}
        ry={6.75}
        transform="matrix(1 0 0 -1 35.25 15.75)"
        fill="url(#paint5_linear_2572_133034)"
      />
    </g>
    <defs>
      <linearGradient
        id="paint0_linear_2572_133034"
        x1={17.4034}
        y1={5.78279}
        x2={1.79724}
        y2={17.8053}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FFF100" />
        <stop offset={1} stopColor="#EDCF00" />
      </linearGradient>
      <linearGradient
        id="paint1_linear_2572_133034"
        x1={17.4034}
        y1={5.78279}
        x2={1.79724}
        y2={17.8053}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FFF100" />
        <stop offset={1} stopColor="#EDCF00" />
      </linearGradient>
      <linearGradient
        id="paint2_linear_2572_133034"
        x1={18.7498}
        y1={12.7499}
        x2={14.366}
        y2={21.9209}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#EEE3FF" />
        <stop offset={1} stopColor="#FBFCDB" />
        <stop offset={1} stopColor="#FBFCDB" />
      </linearGradient>
      <linearGradient
        id="paint3_linear_2572_133034"
        x1={20.7482}
        y1={28.1658}
        x2={11.4958}
        y2={29.5996}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#4F00A3" />
        <stop offset={1} stopColor="#23004E" />
      </linearGradient>
      <linearGradient
        id="paint4_linear_2572_133034"
        x1={9.86247}
        y1={2.17367}
        x2={3.97463}
        y2={3.08609}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#4F00A3" />
        <stop offset={1} stopColor="#23004E" />
      </linearGradient>
      <linearGradient
        id="paint5_linear_2572_133034"
        x1={12.6803}
        y1={2.79472}
        x2={5.11024}
        y2={3.96783}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#4F00A3" />
        <stop offset={1} stopColor="#23004E" />
      </linearGradient>
      <clipPath id="clip0_2572_133034">
        <rect width={42} height={42} fill="white" />
      </clipPath>
    </defs>
  </svg>
);

export default memo(NetworkIcon);

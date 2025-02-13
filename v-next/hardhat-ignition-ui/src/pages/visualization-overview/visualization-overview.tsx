import {
  IgnitionModule,
  IgnitionModuleResult,
} from "@ignored/hardhat-vnext-ignition-core/ui-helpers";
import React from "react";
import styled from "styled-components";

import { DeploymentFlow } from "./components/deployment-flow";
import { ExecutionBatches } from "./components/execution-batches";
import { Summary } from "./components/summary";

import { socialsItems } from "../../components/socials";
import rocketPNG from "../../assets/purple-rocket.png";
import { ExternalLinkIcon } from "../../assets/ExternalLinkIcon";

export const VisualizationOverview: React.FC<{
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>;
  batches: string[][];
}> = ({ ignitionModule, batches }) => {
  return (
    <div>
      <NavBar>
        <HardhatLogo />

        <span style={{ display: "flex", alignItems: "center" }}>
          <DocLink>
            <a href="https://hardhat.org/ignition/docs" target="_blank">
              DOCUMENTATION <ExternalLinkIcon />
            </a>
          </DocLink>

          <SocialsList>
            {socialsItems.map((social) => {
              const { Icon } = social;
              return (
                <SocialListItem key={social.name}>
                  <SocialLink
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Icon />
                  </SocialLink>
                </SocialListItem>
              );
            })}
          </SocialsList>
        </span>
      </NavBar>

      <Contents>
        <header>
          <PageTitle>
            <RocketIcon /> HARDHAT IGNITION
          </PageTitle>
          <br />
          <SubTitle>{ignitionModule.id} deployment visualization</SubTitle>
        </header>

        <Panel>
          <Summary ignitionModule={ignitionModule} />
        </Panel>

        <Panel>
          <DeploymentFlow ignitionModule={ignitionModule} batches={batches} />
        </Panel>

        <Panel>
          <ExecutionBatches ignitionModule={ignitionModule} batches={batches} />
        </Panel>
      </Contents>
    </div>
  );
};

const RocketIcon: React.FC = () => (
  <img
    src={rocketPNG}
    alt="rocket"
    style={{ width: "45px", height: "45px", paddingRight: "1rem" }}
  />
);

const DocLink = styled.span`
  font-size: 14px;
  font-weight: 400;
  line-height: 14px;
  letter-spacing: 0.07em;
  text-align: left;
  margin-top: -5px;

  padding-right: 2rem;

  & a {
    text-decoration: none;
    color: #040405;
  }
`;

const SocialsList = styled.ul`
  min-width: 80px;
  width: 80px;
  display: flex;
  height: 32px;
  align-items: center;
  list-style-type: none;
  justify-content: space-between;
`;

const SocialLink = styled.a`
  display: flex;
  align-items: center;
  & svg {
    fill: #0a0a0a;
  }
  &:hover svg {
    cursor: pointer;
    opacity: 0.8;
  }
  &:focus svg {
    cursor: pointer;
    opacity: 0.5;
  }
`;

const SocialListItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: center;
  & svg {
    width: 22px;
    height: 22px;
  }
`;

const NavBar = styled.div`
  height: 72px;
  padding: 2px 64px;
  border-bottom: 1px solid #b0b2b5;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Contents = styled.div`
  padding: 5rem 180px;
  display: grid;
  row-gap: 1rem;
  min-width: 920px;
`;

const Panel = styled.div`
  padding: 20px 0 40px 0;
  :not(:last-child) {
    border-bottom: 1px solid #b0b2b5;
  }
`;

const PageTitle = styled.div`
  font-size: 20px;
  font-weight: 400;
  line-height: 12px;
  letter-spacing: 0.2em;
  color: #040405;
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
`;

const SubTitle = styled.div`
  font-size: 42px;
  font-weight: 700;
  line-height: 45px;
  letter-spacing: 0.5px;
`;

const HardhatLogo: React.FC = () => (
  <svg width="165" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M75.547 27.244v-7.781h-8.743v7.781H63.74V9.58h3.064v7.425h8.743V9.58h3.093v17.664h-3.093ZM93.885 27.247l-.613-2.124c-.67 1.104-2.648 2.324-5.6 2.324-3.065 0-5.516-1.353-5.516-4.335 0-2.593 1.866-3.782 5.933-4.167l4.487-.442c-.084-2.054-.837-3.242-3.71-3.242-2.647 0-3.37 1.049-3.37 2.815l-2.903.03c0-2.928 1.226-5.189 6.241-5.189 5.822 0 6.661 2.486 6.661 6.293v8.032l-1.61.005Zm-1.31-6.514-4.036.443c-2.478.277-3.315.8-3.315 1.905 0 1.297 1.115 2.043 3.204 2.043 2.618 0 4.152-1.49 4.152-3.947l-.004-.444ZM105.419 15.486c-2.981 0-3.572 1.637-3.572 3.92v7.838h-2.975V13.112h1.589l.703 1.96c.446-.938 1.81-2.152 4.596-2.152h.475v2.623c-.288 0-.565-.057-.816-.057ZM119.74 27.245l-.67-2.015c-.501.966-2.089 2.21-5.465 2.21-4.708 0-6.103-3.396-6.103-7.26 0-3.866 1.338-7.26 6.073-7.26 2.815 0 4.236.994 4.849 1.933V7.731h2.926v19.514h-1.61Zm-5.267-11.844c-3.258 0-3.927 1.932-3.927 4.775 0 2.842.67 4.83 3.901 4.83 3.315 0 4.011-1.931 4.011-4.83 0-2.73-.583-4.772-3.984-4.772l-.001-.003ZM135.204 27.245v-7.922c0-2.65-.447-3.919-3.485-3.919-3.007 0-3.65 1.242-3.65 3.92l-.054 7.921h-2.925V7.731h2.926v7.144c.556-1.015 1.809-1.96 4.541-1.96 4.653 0 5.6 2.623 5.6 6.68v7.645l-2.953.005ZM152.813 27.247l-.613-2.124c-.67 1.104-2.648 2.324-5.605 2.324-3.066 0-5.517-1.353-5.517-4.335 0-2.593 1.867-3.782 5.935-4.167l4.484-.442c-.078-2.054-.83-3.242-3.709-3.242-2.645 0-3.371 1.049-3.371 2.815l-2.903.03c0-2.928 1.227-5.189 6.241-5.189 5.823 0 6.662 2.486 6.662 6.293v8.032l-1.604.005Zm-1.309-6.514-4.037.443c-2.478.277-3.315.8-3.315 1.905 0 1.297 1.115 2.043 3.204 2.043 2.618 0 4.152-1.49 4.152-3.947l-.004-.444ZM161.256 15.486v7.7c0 1.326.557 1.933 3.65 1.796v2.37c-4.708.275-6.686-.83-6.686-4.17v-7.696h-2.036V13.72l2.034-.607V9.58h2.953v3.533h3.733v2.37l-3.648.003Z"
      fill="#0A0A0A"
    />
    <path
      d="M50.782 31.593v-2.42c0-.45-.757-.88-2.116-1.266l.033-3.014c0-4.641-1.44-9.17-4.126-12.975a22.825 22.825 0 0 0-10.886-8.29l-.097-.604a1.722 1.722 0 0 0-.408-.872 1.747 1.747 0 0 0-.815-.521 23.147 23.147 0 0 0-12.925 0c-.317.093-.6.273-.818.52-.217.246-.36.548-.41.872l-.093.563A22.83 22.83 0 0 0 7.159 11.87 22.498 22.498 0 0 0 3 24.892v3.027c-1.34.385-2.087.81-2.087 1.256v2.421a.59.59 0 0 0 .087.408 5.852 5.852 0 0 1 2.247-1.015c2.072-.5 4.179-.85 6.303-1.046A4.25 4.25 0 0 1 12.857 31a8.95 8.95 0 0 0 6.009 2.313H32.83a8.943 8.943 0 0 0 6.008-2.314 4.253 4.253 0 0 1 3.308-1.069c2.123.195 4.23.543 6.302 1.042.77.146 1.498.462 2.13.924.035.035.078.066.108.1a.6.6 0 0 0 .096-.403Z"
      fill="#FFF100"
    />
    <path
      d="M12.89 26.498a53.052 53.052 0 0 1-.03-1.673c.007-8.416 1.992-15.964 5.262-21.235A22.83 22.83 0 0 0 7.16 11.872 22.498 22.498 0 0 0 3 24.892v3.027a55.919 55.919 0 0 1 9.89-1.42Z"
      fill="url(#a)"
    />
    <path
      d="M48.697 24.892a22.425 22.425 0 0 0-5.215-14.396 46.55 46.55 0 0 1 2.162 14.325c0 .82-.022 1.63-.06 2.435a28.49 28.49 0 0 1 3.074.648l.038-3.012Z"
      fill="url(#b)"
    />
    <path
      d="M48.448 30.98c-2.073-.5-4.18-.85-6.303-1.046a4.252 4.252 0 0 0-3.308 1.063 8.943 8.943 0 0 1-6.009 2.313H18.87a8.949 8.949 0 0 1-6.006-2.312 4.25 4.25 0 0 0-3.308-1.071c-2.124.196-4.23.545-6.303 1.045a5.929 5.929 0 0 0-2.246 1.015c1.06 1.607 11.782 3.294 24.846 3.294 13.065 0 23.782-1.693 24.844-3.293-.037-.033-.078-.064-.109-.099a5.462 5.462 0 0 0-2.14-.909Z"
      fill="url(#c)"
    />
    <path d="M25.846 7.818 20.5 16.841l5.346 3.288V7.818Z" fill="#0A0A0A" />
    <path
      d="M25.848 7.822v12.305l5.345-3.284-5.345-9.021ZM25.848 21.915v4.29c.1-.142 5.345-7.58 5.345-7.583l-5.345 3.293Z"
      fill="#4B4D4D"
    />
    <path
      d="m25.848 21.916-5.346-3.288 5.346 7.58v-4.294.002Z"
      fill="#0A0A0A"
    />
    <defs>
      <linearGradient
        id="a"
        x1="10.561"
        y1="27.919"
        x2="10.561"
        y2="3.59"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#EDCF00" />
        <stop offset=".33" stopColor="#F0D500" />
        <stop offset=".77" stopColor="#F9E500" />
        <stop offset="1" stopColor="#FFF100" />
      </linearGradient>
      <linearGradient
        id="b"
        x1="46.089"
        y1="28.096"
        x2="46.089"
        y2="10.496"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#EDCF00" />
        <stop offset=".59" stopColor="#F7E100" />
        <stop offset="1" stopColor="#FFF100" />
      </linearGradient>
      <radialGradient
        id="c"
        cx="0"
        cy="0"
        r="1"
        gradientUnits="userSpaceOnUse"
        gradientTransform="matrix(18.5398 0 0 18.4136 3.701 44.539)"
      >
        <stop stopColor="#FFF100" />
        <stop offset=".23" stopColor="#F9E500" />
        <stop offset=".67" stopColor="#F0D500" />
        <stop offset="1" stopColor="#EDCF00" />
      </radialGradient>
    </defs>
  </svg>
);

import {
  IgnitionModule,
  IgnitionModuleResult,
} from "@nomicfoundation/ignition-core/ui-helpers";
import React from "react";
import styled from "styled-components";

import { DeploymentFlow } from "./components/deployment-flow";
import { Summary } from "./components/summary";
import { ExecutionBatches } from "./components/execution-batches";

import { socialsItems } from "../../components/socials";
import hardhatLogo from "../../../public/hardhat-logo.svg";

export const VisualizationOverview: React.FC<{
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>;
  batches: string[][];
}> = ({ ignitionModule, batches }) => {
  return (
    <div>
      <NavBar>
        <img src={hardhatLogo} alt="Hardhat Logo" />

        <SocialsList>
          {socialsItems.map((social) => {
            const { Icon } = social;
            return (
              <SocialListItem key={social.name}>
                <SocialLink href={social.href} target="_blank" rel="noreferrer">
                  <Icon />
                </SocialLink>
              </SocialListItem>
            );
          })}
        </SocialsList>
      </NavBar>

      <Contents>
        <header>
          <PageTitle>HARDHAT IGNITION 🚀</PageTitle>
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
  padding: 1rem;
  display: grid;
  row-gap: 1rem;
`;

const Panel = styled.div`
  border-bottom: 1px solid #b0b2b5;
`;

const PageTitle = styled.div`
  font-size: 20px;
  font-weight: 400;
  line-height: 12px;
  letter-spacing: 0.2em;
  color: #040405;
`;

const SubTitle = styled.div`
  font-size: 42px;
  font-weight: 700;
  line-height: 45px;
  letter-spacing: 0.5px;
`;

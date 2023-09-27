import {
  IgnitionModule,
  IgnitionModuleResult,
} from "@nomicfoundation/ignition-core/ui-helpers";
import React from "react";
import styled from "styled-components";
import { DeploymentFlow } from "./components/deployment-flow";
import { Summary } from "./components/summary";
import { ExecutionBatches } from "./components/execution-batches";

export const VisualizationOverview: React.FC<{
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>;
}> = ({ ignitionModule }) => {
  return (
    <Page>
      <header>
        <PageTitle>Hardhat Ignition 🚀</PageTitle>
        <SubTitle>{ignitionModule.id} deployment visualization</SubTitle>
      </header>

      <Panel>
        <Summary ignitionModule={ignitionModule} />
      </Panel>

      <Panel>
        <DeploymentFlow ignitionModule={ignitionModule} />
      </Panel>

      <Panel>
        <ExecutionBatches ignitionModule={ignitionModule} />
      </Panel>
    </Page>
  );
};

const Page = styled.div`
  padding: 1rem;
  display: grid;
  row-gap: 1rem;
`;

const Panel = styled.div``;

const PageTitle = styled.div`
  font-size: 2.5rem;
`;

const SubTitle = styled.div`
  font-size: 1.5rem;
  color: #5c5c5c;
  font-style: italic;
`;

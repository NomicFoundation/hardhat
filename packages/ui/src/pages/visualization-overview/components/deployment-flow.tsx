import {
  IgnitionModule,
  IgnitionModuleResult,
} from "@nomicfoundation/ignition-core/ui-helpers";
import React from "react";
import { Tooltip } from "react-tooltip";
import styled from "styled-components";
import { Mermaid } from "../../../components/mermaid";

export const DeploymentFlow: React.FC<{
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>;
}> = ({ ignitionModule }) => {
  return (
    <div>
      <SectionHeader>
        Deployment flow <FlowTooltip />
      </SectionHeader>

      <Mermaid ignitionModule={ignitionModule} />
    </div>
  );
};

const FlowTooltip: React.FC = () => (
  <span style={{ fontSize: "1.25rem" }}>
    <a data-tooltip-id="flow-tooltip">ℹ️</a>
    <Tooltip className="styled-tooltip flow-tooltip" id="flow-tooltip">
      <div style={{ fontWeight: 700 }}>Diagram reference</div>
      <br />
      <span>Future to future dependency</span>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      <span>---&gt;</span>
      <br />
      <span>Module to module dependency</span>&nbsp;&nbsp;&nbsp;&nbsp;
      <span>- - -&gt;</span>
    </Tooltip>
  </span>
);

const SectionHeader = styled.div`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  margin-top: 1rem;
`;

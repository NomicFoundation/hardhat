import {
  IgnitionModule,
  IgnitionModuleResult,
} from "@nomicfoundation/ignition-core/ui-helpers";
import styled from "styled-components";
import { Mermaid } from "../../../components/mermaid";

export const DeploymentFlow: React.FC<{
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>;
}> = ({ ignitionModule }) => {
  return (
    <div>
      <SectionHeader>Deployment flow *tooltip*</SectionHeader>

      <Mermaid ignitionModule={ignitionModule} />
    </div>
  );
};

const SectionHeader = styled.div`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  margin-top: 1rem;
`;

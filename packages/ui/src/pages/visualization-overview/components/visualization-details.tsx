import { StoredDeployment } from "@ignored/ignition-core/ui-helpers";
import { useMemo } from "react";
import styled from "styled-components";
import { Mermaid } from "../../../components/mermaid";
import { getAllFuturesForModule } from "../../../queries/futures";
import { Action } from "./action";

export const VisualizationDetails: React.FC<{ deployment: StoredDeployment }> =
  ({ deployment }) => {
    const futures = useMemo(
      () => getAllFuturesForModule(deployment.module),
      [deployment]
    );

    return (
      <div>
        <h2>Visualization</h2>

        <div>
          <Mermaid deployment={deployment} />
        </div>

        <h3>Actions</h3>
        <Actions>
          {futures.map((future) => (
            <Action key={future.id} future={future} />
          ))}
        </Actions>
      </div>
    );
  };

const Actions = styled.div`
  display: grid;
  row-gap: 0.5rem;
`;

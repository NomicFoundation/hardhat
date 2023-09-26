import {
  FutureType,
  IgnitionModule,
  IgnitionModuleResult,
} from "@nomicfoundation/ignition-core/ui-helpers";
import { useMemo, useState } from "react";
import styled from "styled-components";
import { Mermaid } from "../../../components/mermaid";
import { getAllFuturesForModule } from "../../../queries/futures";
import { FutureBlock } from "./future-block";

export const VisualizationDetails: React.FC<{
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>;
}> = ({ ignitionModule }) => {
  const futures = useMemo(
    () => getAllFuturesForModule(ignitionModule),
    [ignitionModule]
  );

  const toggleMap = Object.fromEntries(
    futures
      .filter(
        ({ type }) =>
          type !== FutureType.LIBRARY_DEPLOYMENT &&
          type !== FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT
      )
      .map(({ id }) => [id, false])
  );

  const [toggleState, setToggledInternal] = useState(toggleMap);

  const setToggled = (id: string) => {
    const newState = { ...toggleState, [id]: !toggleState[id] };
    setToggledInternal(newState);
  };

  return (
    <div>
      <h2>Visualization</h2>

      <div>
        <Mermaid ignitionModule={ignitionModule} />
      </div>

      <h3>Futures</h3>
      <Actions>
        {futures.map((future) => (
          <FutureBlock
            key={future.id}
            future={future}
            toggleState={toggleState}
            setToggled={setToggled}
          />
        ))}
      </Actions>
    </div>
  );
};

const Actions = styled.div`
  display: grid;
  row-gap: 0.5rem;
`;

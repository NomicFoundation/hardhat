import {
  FutureType,
  IgnitionModule,
  IgnitionModuleResult,
} from "@nomicfoundation/ignition-core/ui-helpers";
import { useMemo, useState } from "react";
import styled from "styled-components";

import { getAllFuturesForModule } from "../../../queries/futures";
import { FutureBlock } from "./future-block";

export const ExecutionBatches: React.FC<{
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
      <SectionHeader>Execution batches *tooltip*</SectionHeader>

      {/* todo: integrate for placeholder below after batching work */}
      <SectionSubHeader>
        <strong>8 futures</strong> will be executed across 3{" "}
        <strong>batches</strong>
      </SectionSubHeader>

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

const SectionHeader = styled.div`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  margin-top: 1rem;
`;

const SectionSubHeader = styled.div`
  margin-bottom: 1rem;
  margin-top: 1rem;
`;

const Actions = styled.div`
  display: grid;
  row-gap: 0.5rem;
`;

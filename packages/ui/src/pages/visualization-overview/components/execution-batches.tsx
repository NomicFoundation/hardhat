import {
  Future,
  FutureType,
  IgnitionModule,
  IgnitionModuleResult,
} from "@nomicfoundation/ignition-core/ui-helpers";
import { useMemo, useState } from "react";
import { Tooltip } from "react-tooltip";
import styled from "styled-components";

import { getAllFuturesForModule } from "../../../queries/futures";
import { FutureBatch } from "./future-batch";

export const ExecutionBatches: React.FC<{
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>;
  batches: string[][];
}> = ({ ignitionModule, batches }) => {
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

  const [currentlyHovered, setCurrentlyHovered] = useState("");

  const futureBatches = batches.reduce((acc, batch) => {
    const fullBatch = batch.map((id) => futures.find((f) => f.id === id));

    return [...acc, fullBatch as Future[]];
  }, [] as Future[][]);

  return (
    <div>
      <SectionHeader>
        Execution batches <BatchesTooltip />
      </SectionHeader>

      <SectionSubHeader>
        <strong>{futures.length} futures</strong> will be executed across{" "}
        {batches.length} <strong>batches</strong>
      </SectionSubHeader>

      <RootModuleBackground>
        <RootModuleName>[{ignitionModule.id}]</RootModuleName>
        <Actions currentlyHovered={currentlyHovered}>
          {futureBatches.map((batch, i) => (
            <FutureBatch
              key={`batch-${i}`}
              batch={batch}
              index={i + 1}
              toggleState={toggleState}
              setToggled={setToggled}
              setCurrentlyHovered={setCurrentlyHovered}
            />
          ))}
        </Actions>
      </RootModuleBackground>
    </div>
  );
};

const BatchesTooltip: React.FC = () => (
  <span style={{ fontSize: "1.25rem" }}>
    <a data-tooltip-id="batches-tooltip">ℹ️</a>
    <Tooltip className="styled-tooltip batches-tooltip" id="batches-tooltip">
      <div>
        Futures that can be parallelized are executed at the same time in
        batches.
      </div>
      <br />
      <div>
        The order of the futures represented here is not representative of the
        final order when the deployment is executed, which can only be known
        once they confirm. The specific order, though, is not relevant for the
        deployment, which is why they can be parallelized.
      </div>
    </Tooltip>
  </span>
);

const RootModuleName = styled.div`
  font-weight: 700;
  padding-bottom: 1.5rem;
`;

const RootModuleBackground = styled.div`
  background: #f6f6f6;
  border: 1px solid #bebebe;
  padding: 1.5rem;
`;

const SectionHeader = styled.div`
  font-size: 28px;
  font-weight: 700;
  line-height: 30px;
  letter-spacing: 0em;

  margin-bottom: 1rem;
  margin-top: 1rem;
`;

const SectionSubHeader = styled.div`
  margin-bottom: 1rem;
  margin-top: 1rem;
`;

const Actions = styled.div<{ currentlyHovered: string }>`
  display: grid;
  row-gap: 0.5rem;

  ${({ currentlyHovered }) =>
    currentlyHovered &&
    `
    .${currentlyHovered} {
      font-weight: 700;
    }
  `}
`;

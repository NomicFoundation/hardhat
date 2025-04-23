import {
  Future,
  FutureType,
  IgnitionModule,
  IgnitionModuleResult,
} from "@nomicfoundation/ignition-core/ui-helpers";
import { useMemo, useRef, useState, createRef } from "react";
import { Tooltip } from "react-tooltip";
import styled from "styled-components";

import { getAllFuturesForModule } from "../../../queries/futures";
import { FutureBatch } from "./future-batch";
import { TooltipIcon } from "../../../assets/TooltipIcon";

export const ExecutionBatches: React.FC<{
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>;
  batches: string[][];
}> = ({ ignitionModule, batches }) => {
  const futures = useMemo(
    () => getAllFuturesForModule(ignitionModule),
    [ignitionModule],
  );

  const nonLibraryFutureIds = futures
    .filter(
      ({ type }) =>
        type !== FutureType.LIBRARY_DEPLOYMENT &&
        type !== FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT,
    )
    .map(({ id }) => id);

  const scrollRefMap = useRef(
    nonLibraryFutureIds.reduce(
      (acc, id) => {
        return { ...acc, [id]: createRef<HTMLDivElement>() };
      },
      {} as Record<string, React.RefObject<HTMLDivElement>>,
    ),
  );

  const toggleMap = Object.fromEntries(
    nonLibraryFutureIds.map((id) => [id, false]),
  );

  const [toggleState, setToggledInternal] = useState(toggleMap);

  const setToggled = (id: string, newToggleState: boolean) => {
    if (newToggleState) {
      scrollRefMap.current[id].current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }

    const newState = { ...toggleState, [id]: newToggleState };
    setToggledInternal(newState);
  };

  const [currentlyHovered, setCurrentlyHovered] = useState("");

  const futureBatches = batches.reduce((acc, batch) => {
    const fullBatch = batch.map((id) => futures.find((f) => f.id === id));

    return [...acc, fullBatch as Future[]];
  }, [] as Future[][]);

  /* logic for highlighting a future based on future details hover */
  const futureHoverMap = Object.fromEntries(
    batches.flatMap((batch, i) => {
      const batchId = `batch-${i + 1}`;

      return batch.map((id, j) => [id, `${batchId}-future-${j}`]);
    }),
  );
  const [hoveredFuture, setHoveredFutureInternal] = useState("");

  const setHoveredFuture = (id: string) => {
    const futureId = futureHoverMap[id];
    setHoveredFutureInternal(futureId);
  };

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
        <RootModuleName>[ {ignitionModule.id} ]</RootModuleName>
        <Actions
          currentlyHovered={currentlyHovered}
          hoveredFuture={hoveredFuture}
        >
          {futureBatches.map((batch, i) => (
            <FutureBatch
              key={`batch-${i}`}
              batch={batch}
              index={i + 1}
              toggleState={toggleState}
              setToggled={setToggled}
              setCurrentlyHovered={setCurrentlyHovered}
              setHoveredFuture={setHoveredFuture}
              scrollRefMap={scrollRefMap.current}
            />
          ))}
        </Actions>
      </RootModuleBackground>
    </div>
  );
};

const BatchesTooltip: React.FC = () => (
  <span style={{ paddingLeft: "0.5rem", cursor: "pointer" }}>
    <a data-tooltip-id="batches-tooltip">
      <TooltipIcon />
    </a>
    <Tooltip className="styled-tooltip batches-tooltip" id="batches-tooltip">
      <div>
        Futures that can be run simultaneously are executed at the same time in
        batches.
      </div>
      <br />
      <div>
        The sequence order shown for each batch doesn&apos;t reflect the final
        execution order. The exact order is determined once they&apos;re run.
        However, this specific order isn&apos;t relevant to the process,
        allowing for simultaneous execution.
      </div>
    </Tooltip>
  </span>
);

const RootModuleName = styled.div`
  font-weight: 700;
  padding-bottom: 1.5rem;
  padding-left: 1.5rem;
`;

const RootModuleBackground = styled.div`
  border: 1px solid #e5e6e7;
  border-radius: 10px;
  padding: 1.5rem;
`;

const SectionHeader = styled.div`
  font-size: 28px;
  font-weight: 700;
  line-height: 30px;
  letter-spacing: 0em;
  display: inline-flex;
  align-items: center;

  margin-bottom: 1rem;
  margin-top: 1rem;
`;

const SectionSubHeader = styled.div`
  margin-bottom: 2rem;
  margin-top: 2rem;
`;

const Actions = styled.div<{ currentlyHovered: string; hoveredFuture: string }>`
  display: grid;
  row-gap: 1.5rem;

  ${({ currentlyHovered }) =>
    currentlyHovered &&
    `
    .${currentlyHovered} {
      background: #16181D;
      color: #FBF8D8;
    }
  `}

  ${({ hoveredFuture }) =>
    hoveredFuture &&
    `
    .${hoveredFuture} {
      background: #16181D;
      color: #FBF8D8;
      box-shadow: -2px 2px 4px 0px #6C6F7433;
    }
  `}
`;

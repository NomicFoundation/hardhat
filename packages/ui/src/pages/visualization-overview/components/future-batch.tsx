import {
  ArgumentType,
  Future,
  FutureType,
  isFuture,
  isDeploymentType,
} from "@nomicfoundation/ignition-core/ui-helpers";
import React from "react";
import styled from "styled-components";
import { argumentTypeToString } from "../../../utils/argumentTypeToString";

export const FutureBatch: React.FC<{
  batch: Future[];
  index: number;
  toggleState: Record<string, boolean>;
  setToggled: (id: string) => void;
  setCurrentlyHovered: (id: string) => void;
}> = ({ batch, index, toggleState, setToggled, setCurrentlyHovered }) => {
  return (
    <Batch>
      <BatchHeader>
        Batch <strong>#{index}</strong>
      </BatchHeader>
      {batch.map((future, i) => (
        <FutureBlock
          key={`batch-${index}-future-${i}`}
          future={future}
          toggleState={toggleState}
          setToggled={setToggled}
          setCurrentlyHovered={setCurrentlyHovered}
        />
      ))}
    </Batch>
  );
};

const Batch = styled.div`
  background: #f2efef;
  padding: 0.5rem;
`;

const BatchHeader = styled.div`
  margin: 0.5rem;
`;

const FutureBtn = styled.div<{ isLibrary: boolean }>`
  padding: 0.5rem;
  margin: 0.5rem;

  ${(props) =>
    !props.isLibrary &&
    `
    cursor: pointer;
  `}
`;

const Text = styled.div`
  margin: 0;
  display: inline;
`;

const FutureBlock: React.FC<{
  future: Future;
  toggleState: Record<string, boolean>;
  setToggled: (id: string) => void;
  setCurrentlyHovered: (id: string) => void;
}> = ({ future, toggleState, setToggled, setCurrentlyHovered }) => {
  const futureId = future.id;
  const toggled = toggleState[futureId];

  const displayText = toDisplayText(future);

  const isLibrary =
    future.type === FutureType.LIBRARY_DEPLOYMENT ||
    future.type === FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT;

  return (
    <FutureBtn
      className={
        isDeploymentType(future.type) ? "deploy-background" : "call-background"
      }
      onClick={() => setToggled(futureId)}
      isLibrary={isLibrary}
    >
      {!isLibrary && <ToggleBtn toggled={toggled} />}
      <Text>{displayText}</Text>
      <Text
        className={future.module.id}
        style={{ float: "right" }}
        onMouseEnter={() => setCurrentlyHovered(future.module.id)}
        onMouseLeave={() => setCurrentlyHovered("")}
      >
        [{future.module.id}]
      </Text>
      {toggled && (
        <FutureDetailsSection future={future} setToggled={setToggled} />
      )}
    </FutureBtn>
  );
};

function toDisplayText(future: Future): string {
  switch (future.type) {
    case FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT:
    case FutureType.CONTRACT_DEPLOYMENT:
      return `Deploy ${future.contractName}`;
    case FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT:
      return `Library deploy ${future.id}`;
    case FutureType.LIBRARY_DEPLOYMENT:
      return `Library deploy ${future.id} from artifact`;
    case FutureType.CONTRACT_CALL:
      return `Call ${future.contract.contractName}/${future.functionName}`;
    case FutureType.STATIC_CALL:
      return `Static call ${future.id}`;
    case FutureType.NAMED_ARTIFACT_CONTRACT_AT:
      return `Existing contract ${future.id} (${
        typeof future.address === "string"
          ? future.address
          : isFuture(future.address)
          ? future.address.id
          : argumentTypeToString(future.address)
      })`;
    case FutureType.CONTRACT_AT:
      return `Existing contract ${future.id} from artifact (${
        typeof future.address === "string"
          ? future.address
          : isFuture(future.address)
          ? future.address.id
          : argumentTypeToString(future.address)
      })`;
    case FutureType.READ_EVENT_ARGUMENT:
      return `Read event from future ${future.futureToReadFrom.id} (event ${future.eventName} argument ${future.nameOrIndex})`;
    case FutureType.SEND_DATA:
      return `Send data ${future.id} to ${
        typeof future.to === "string"
          ? future.to
          : isFuture(future.to)
          ? future.to.id
          : argumentTypeToString(future.to)
      }`;
  }
}

const ToggleBtn: React.FC<{
  toggled: boolean;
}> = ({ toggled }) => {
  return <Text style={{ fontSize: "1.5rem" }}>{toggled ? "- " : "+ "}</Text>;
};

const FutureDetailsSection: React.FC<{
  future: Future;
  setToggled: (id: string) => void;
}> = ({ future, setToggled }) => {
  switch (future.type) {
    case FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT:
    case FutureType.CONTRACT_DEPLOYMENT:
      return (
        <div>
          <p>Constructor Arguments</p>
          <ul>
            {Object.entries(future.constructorArgs).map(([, arg]) => (
              <Argument setToggled={setToggled} arg={arg} />
            ))}
          </ul>
        </div>
      );
    case FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT:
    case FutureType.LIBRARY_DEPLOYMENT:
      return null;
    case FutureType.CONTRACT_CALL:
      return (
        <div>
          <p>Arguments</p>
          <ul>
            {Object.entries(future.args).map(([, arg]) => (
              <Argument setToggled={setToggled} arg={arg} />
            ))}
          </ul>
        </div>
      );
    case FutureType.STATIC_CALL:
      return (
        <div>
          <p>Arguments</p>
          <ul>
            {Object.entries(future.args).map(([, arg]) => (
              <Argument setToggled={setToggled} arg={arg} />
            ))}
          </ul>
        </div>
      );
    case FutureType.NAMED_ARTIFACT_CONTRACT_AT:
    case FutureType.CONTRACT_AT:
      return (
        <div>
          <p>Contract - {future.contractName}</p>
          <p>
            Address -{" "}
            {typeof future.address === "string" ? (
              future.address
            ) : (
              <Argument setToggled={setToggled} arg={future.address} />
            )}
          </p>
        </div>
      );
    case FutureType.READ_EVENT_ARGUMENT:
      return (
        <div>
          <p>Emitter - {future.emitter.id}</p>
          <p>Event - {future.eventName}</p>
          <p>Event index - {future.eventIndex}</p>
          <p>Argument - {future.nameOrIndex}</p>
        </div>
      );
    case FutureType.SEND_DATA:
      return (
        <div>
          <p>
            To -{" "}
            {typeof future.to === "string" ? (
              future.to
            ) : (
              <Argument setToggled={setToggled} arg={future.to} />
            )}
          </p>
          <p>Data - {future.data}</p>
        </div>
      );
  }
};

const Argument: React.FC<{
  setToggled: (id: string) => void;
  arg: ArgumentType;
}> = ({ setToggled, arg }) => {
  if (isFuture(arg)) {
    return (
      <li
        style={{
          textDecoration: "underline",
          color: "blue",
          cursor: "pointer",
        }}
        onClick={() => setToggled(arg.id)}
      >
        {argumentTypeToString(arg)}
      </li>
    );
  }
  return <li>{argumentTypeToString(arg)}</li>;
};

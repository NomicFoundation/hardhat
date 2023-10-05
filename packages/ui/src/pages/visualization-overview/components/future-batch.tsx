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
  padding: 1rem;
  border: 2px solid #edcf00;
  border-radius: 7px;
`;

const BatchHeader = styled.div`
  padding: 1rem;
`;

const FutureBtn = styled.div<{ isLibrary: boolean; toggled: boolean }>`
  padding: 1rem;
  margin: 1rem;

  border-top-left-radius: 5px;
  border-top-right-radius: 5px;

  ${(props) =>
    props.toggled &&
    `
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    `}

  ${(props) =>
    !props.toggled &&
    `
      border-bottom-left-radius: 5px;
      border-bottom-right-radius: 5px;
    `}

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

const ModuleName = styled.div`
  margin: 0;
  display: inline;

  font-weight: 700;
  float: right;
  padding: 0.5rem;
  margin-top: -0.5rem;
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

  const className = isDeploymentType(future.type)
    ? "deploy-background"
    : "call-background";

  return (
    <div>
      <FutureBtn
        className={className}
        isLibrary={isLibrary}
        toggled={toggled}
        onClick={() => setToggled(futureId)}
      >
        {!isLibrary && <ToggleBtn toggled={toggled} />}
        <Text style={{ paddingLeft: isLibrary ? "1rem" : "0.3rem" }}>
          {displayText}
        </Text>
        <ModuleName
          className={future.module.id}
          onMouseEnter={() => setCurrentlyHovered(future.module.id)}
          onMouseLeave={() => setCurrentlyHovered("")}
        >
          [ {future.module.id} ]
        </ModuleName>
      </FutureBtn>
      {toggled && (
        <FutureDetailsSection
          className={className}
          future={future}
          setToggled={setToggled}
        />
      )}
    </div>
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
  return <Text>{toggled ? "- " : "+ "}</Text>;
};

const FutureDetailsStyle = styled.div`
  cursor: auto;
  padding: 1rem 2rem;
  margin: -1rem 1rem 1rem 1rem;

  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-bottom-right-radius: 5px;
  border-bottom-left-radius: 5px;

  -webkit-box-shadow: inset 0px 6px 8px -8px rgba(0, 0, 0, 0.3);
  -moz-box-shadow: inset 0px 6px 8px -8px rgba(0, 0, 0, 0.3);
  box-shadow: inset 0px 6px 8px -8px rgba(0, 0, 0, 0.3);
`;

const FutureDetailsSection: React.FC<{
  className: string;
  future: Future;
  setToggled: (id: string) => void;
}> = ({ className, future, setToggled }) => {
  switch (future.type) {
    case FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT:
    case FutureType.CONTRACT_DEPLOYMENT: {
      const args = Object.entries(future.constructorArgs);
      return (
        <FutureDetailsStyle className={className}>
          <p>{args.length === 0 ? "No " : null}Constructor Arguments</p>
          <ul>
            {args.map(([, arg], i) => (
              <Argument key={`arg-${i}`} setToggled={setToggled} arg={arg} />
            ))}
          </ul>
        </FutureDetailsStyle>
      );
    }
    case FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT:
    case FutureType.LIBRARY_DEPLOYMENT:
      return null;
    case FutureType.CONTRACT_CALL: {
      const args = Object.entries(future.args);
      return (
        <FutureDetailsStyle className={className}>
          <p>{args.length === 0 ? "No " : null}Arguments</p>
          <ul>
            {args.map(([, arg], i) => (
              <Argument key={`arg-${i}`} setToggled={setToggled} arg={arg} />
            ))}
          </ul>
        </FutureDetailsStyle>
      );
    }
    case FutureType.STATIC_CALL: {
      const args = Object.entries(future.args);
      return (
        <FutureDetailsStyle className={className}>
          <p>{args.length === 0 ? "No " : null}Arguments</p>
          <ul>
            {args.map(([, arg], i) => (
              <Argument key={`arg-${i}`} setToggled={setToggled} arg={arg} />
            ))}
          </ul>
        </FutureDetailsStyle>
      );
    }
    case FutureType.NAMED_ARTIFACT_CONTRACT_AT:
    case FutureType.CONTRACT_AT: {
      return (
        <FutureDetailsStyle className={className}>
          <p>Contract - {future.contractName}</p>
          <p>
            Address -{" "}
            {typeof future.address === "string" ? (
              future.address
            ) : (
              <Argument setToggled={setToggled} arg={future.address} />
            )}
          </p>
        </FutureDetailsStyle>
      );
    }
    case FutureType.READ_EVENT_ARGUMENT: {
      return (
        <FutureDetailsStyle className={className}>
          <p>Emitter - {future.emitter.id}</p>
          <p>Event - {future.eventName}</p>
          <p>Event index - {future.eventIndex}</p>
          <p>Argument - {future.nameOrIndex}</p>
        </FutureDetailsStyle>
      );
    }
    case FutureType.SEND_DATA: {
      return (
        <FutureDetailsStyle className={className}>
          <p>
            To -{" "}
            {typeof future.to === "string" ? (
              future.to
            ) : (
              <Argument setToggled={setToggled} arg={future.to} />
            )}
          </p>
          <p>Data - {future.data}</p>
        </FutureDetailsStyle>
      );
    }
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

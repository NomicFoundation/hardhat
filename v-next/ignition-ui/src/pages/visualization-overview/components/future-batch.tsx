import {
  ArgumentType,
  Future,
  FutureType,
  isDeploymentType,
  isFuture,
} from "@nomicfoundation/ignition-core/ui-helpers";
import React from "react";
import styled from "styled-components";
import { argumentTypeToString } from "../../../utils/argumentTypeToString";
import { FutureHeader } from "./future-header";

export const FutureBatch: React.FC<{
  batch: Future[];
  index: number;
  toggleState: Record<string, boolean>;
  setToggled: (id: string, newToggleState: boolean) => void;
  setCurrentlyHovered: (id: string) => void;
  setHoveredFuture: (id: string) => void;
  scrollRefMap: Record<string, React.RefObject<HTMLDivElement>>;
}> = ({
  batch,
  index,
  toggleState,
  setToggled,
  setCurrentlyHovered,
  setHoveredFuture,
  scrollRefMap,
}) => {
  return (
    <Batch>
      <BatchHeader>
        Batch <strong>#{index}</strong>
      </BatchHeader>
      {batch.map((future, i) => (
        <FutureBlock
          key={`batch-${index}-future-${i}`}
          classKey={`batch-${index}-future-${i}`}
          future={future}
          toggleState={toggleState}
          setToggled={setToggled}
          setCurrentlyHovered={setCurrentlyHovered}
          setHoveredFuture={setHoveredFuture}
          scrollRef={scrollRefMap[future.id]}
        />
      ))}
    </Batch>
  );
};

const Batch = styled.div`
  padding: 1rem;
  border: 1px solid #edcf00;
  border-radius: 7px;
`;

const BatchHeader = styled.div`
  padding: 1rem;
`;

const FutureBtn = styled.div<{ isLibrary: boolean; toggled: boolean }>`
  padding: 1rem;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
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

const FutureBlock: React.FC<{
  future: Future;
  toggleState: Record<string, boolean>;
  setToggled: (id: string, newToggleState: boolean) => void;
  setCurrentlyHovered: (id: string) => void;
  setHoveredFuture: (id: string) => void;
  classKey: string;
  scrollRef: React.RefObject<HTMLDivElement>;
}> = ({
  future,
  toggleState,
  setToggled,
  setCurrentlyHovered,
  setHoveredFuture,
  classKey,
  scrollRef,
}) => {
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
    <div ref={scrollRef}>
      <FutureBtn
        className={`${className} ${classKey}`}
        isLibrary={isLibrary}
        toggled={toggled}
        onClick={() => setToggled(futureId, !toggled)}
      >
        <FutureHeader
          isLibrary={isLibrary}
          toggled={toggled}
          displayText={displayText}
          future={future}
          setCurrentlyHovered={setCurrentlyHovered}
        ></FutureHeader>
      </FutureBtn>
      {toggled && (
        <FutureDetailsSection
          className={className}
          future={future}
          setToggled={setToggled}
          setHoveredFuture={setHoveredFuture}
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
      return `Call ${future.contract.contractName}.${future.functionName}`;
    case FutureType.STATIC_CALL:
      return `Static call ${future.id}`;
    case FutureType.ENCODE_FUNCTION_CALL:
      return `Encode function call ${future.id}`;
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
  setToggled: (id: string, newToggleState: boolean) => void;
  setHoveredFuture: (id: string) => void;
}> = ({ className, future, setToggled, setHoveredFuture }) => {
  switch (future.type) {
    case FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT:
    case FutureType.CONTRACT_DEPLOYMENT: {
      const args = Object.entries(future.constructorArgs);
      return (
        <FutureDetailsStyle className={className}>
          <p>{args.length === 0 ? "No " : null}Constructor Arguments</p>
          <ul>
            {args.map(([, arg], i) => (
              <li key={`arg-${i}`}>
                <Argument
                  setToggled={setToggled}
                  arg={arg}
                  setHoveredFuture={setHoveredFuture}
                />
              </li>
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
              <li key={`arg-${i}`}>
                <Argument
                  setToggled={setToggled}
                  arg={arg}
                  setHoveredFuture={setHoveredFuture}
                />
              </li>
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
              <li key={`arg-${i}`}>
                <Argument
                  setToggled={setToggled}
                  arg={arg}
                  setHoveredFuture={setHoveredFuture}
                />
              </li>
            ))}
          </ul>
        </FutureDetailsStyle>
      );
    }
    case FutureType.ENCODE_FUNCTION_CALL: {
      const args = Object.entries(future.args);
      return (
        <FutureDetailsStyle className={className}>
          <p>{args.length === 0 ? "No " : null}Arguments</p>
          <ul>
            {args.map(([, arg], i) => (
              <li key={`arg-${i}`}>
                <Argument
                  setToggled={setToggled}
                  arg={arg}
                  setHoveredFuture={setHoveredFuture}
                />
              </li>
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
              <Argument
                setToggled={setToggled}
                arg={future.address}
                setHoveredFuture={setHoveredFuture}
              />
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
              <Argument
                setToggled={setToggled}
                arg={future.to}
                setHoveredFuture={setHoveredFuture}
              />
            )}
          </p>
          <p>
            Data -{" "}
            {typeof future.data === "string" ? (
              future.data
            ) : future.data === undefined ? (
              "0x"
            ) : (
              <Argument
                setToggled={setToggled}
                arg={future.data}
                setHoveredFuture={setHoveredFuture}
              />
            )}
          </p>
        </FutureDetailsStyle>
      );
    }
  }
};

const Argument: React.FC<{
  setToggled: (id: string, newToggleState: boolean) => void;
  setHoveredFuture: (id: string) => void;
  arg: ArgumentType;
}> = ({ setToggled, arg, setHoveredFuture }) => {
  if (isFuture(arg)) {
    return (
      <ArgumentLink
        style={{
          textDecoration: "underline",
          color: "#16181D",
          cursor: "pointer",
        }}
        className="future-argument"
        onClick={() => setToggled(arg.id, true)}
        onMouseEnter={() => setHoveredFuture(arg.id)}
        onMouseLeave={() => setHoveredFuture("")}
      >
        {argumentTypeToString(arg)}
      </ArgumentLink>
    );
  }

  return <ArgumentText>{argumentTypeToString(arg)}</ArgumentText>;
};

const ArgumentText = styled.p`
  margin: 0;
`;

const ArgumentLink = styled.a`
  textdecoration: underline;
  color: #16181d;
  cursor: pointer;

  &:hover {
    font-weight: 700;
  }
`;

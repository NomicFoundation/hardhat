import { Future } from "@nomicfoundation/ignition-core/ui-helpers";
import styled from "styled-components";

export const FutureHeader: React.FC<{
  isLibrary: boolean;
  toggled: boolean;
  displayText: string;
  setCurrentlyHovered: (id: string) => void;
  future: Future;
}> = ({ isLibrary, toggled, displayText, setCurrentlyHovered, future }) => {
  if (isLibrary) {
    return (
      <ToggleNameWrap>
        <div />
        <ToggleNameText>{displayText}</ToggleNameText>
      </ToggleNameWrap>
    );
  }

  return (
    <ToggleNameWrap>
      {isLibrary ? <div /> : <ToggleBtn toggled={toggled} />}
      <ToggleNameText>{displayText}</ToggleNameText>
      <div />
      <ModuleName
        className={future.module.id}
        onMouseEnter={() => setCurrentlyHovered(future.module.id)}
        onMouseLeave={() => setCurrentlyHovered("")}
      >
        [ {future.module.id} ]
      </ModuleName>
    </ToggleNameWrap>
  );
};

const ToggleNameWrap = styled.div`
  display: grid;
  grid-template-columns: 1rem auto 1fr auto;
`;

const ToggleBtn: React.FC<{
  toggled: boolean;
}> = ({ toggled }) => {
  return <ToggleNameText>{toggled ? "- " : "+ "}</ToggleNameText>;
};

const ModuleName = styled.div`
  font-weight: 700;
  padding: 0.5rem;
`;

const ToggleNameText = styled.p`
  margin: 0;
  display: inline;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  text-align: center;
`;

import React, { useContext } from "react";
import { styled } from "linaria/react";
import { GlobalTabsContext } from "../../global-tabs";

export interface ITab {
  children: JSX.Element[] | JSX.Element;
  value: string;
  type: string;
}

const StyledTab = styled.div<{ value: string; selectedTab: string }>`
  display: ${({ value, selectedTab }) =>
    value === selectedTab ? "block" : "none"};
`;

const Tab = ({ children, value, type }: ITab) => {
  const { tabsState } = useContext(GlobalTabsContext);
  const selectedTab = tabsState[type];

  return (
    <StyledTab value={value} selectedTab={selectedTab} className="tab">
      {children}
    </StyledTab>
  );
};

export default Tab;

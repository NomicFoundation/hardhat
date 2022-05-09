import React, { useContext } from "react";
import { styled } from "linaria/react";
import { media, tm, tmDark, tmHCDark, tmSelectors } from "../../themes";
import { GlobalTabsContext } from "../../global-tabs";

interface ITabsGroup {
  children: React.ReactNode[];
  options: string;
  type: string;
}

const StyledTabButton = styled.div<{ value: string }>`
  padding: 6px 10px;
  border-radius: 2px;
  font-size: 10px;
  line-height: 15px;
  height: 27px;
  letter-spacing: 0.05em;
  cursor: pointer;
  color: ${tm(({ colors }) => colors.neutral600)};
  background-color: ${tm(({ colors }) => colors.tabBackground)};
  &:hover {
    background-color: ${tm(({ colors }) => colors.tabBackgroundHover)};
    color: ${tm(({ colors }) => colors.neutral400)};
  }
  &[data-selected="true"] {
    background-color: ${tm(({ colors }) => colors.tabBackgroundSelected)};
    color: ${tm(({ colors }) => colors.neutral400)};
  }
  ///
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral600)};
    background-color: ${tmDark(({ colors }) => colors.tabBackground)};
    &:hover {
      background-color: ${tmDark(({ colors }) => colors.tabBackgroundHover)};
      color: ${tmDark(({ colors }) => colors.neutral400)};
    }
    &[data-selected="true"] {
      background-color: ${tmDark(({ colors }) => colors.tabBackgroundSelected)};
      color: ${tmDark(({ colors }) => colors.neutral400)};
    }
  }

  ${tmSelectors.hcDark} {
    color: ${tmHCDark(({ colors }) => colors.neutral600)};
    background-color: ${tmHCDark(({ colors }) => colors.tabBackground)};
    &:hover {
      background-color: ${tmHCDark(({ colors }) => colors.tabBackgroundHover)};
      color: ${tmHCDark(({ colors }) => colors.neutral400)};
    }
    &[data-selected="true"] {
      background-color: ${tmHCDark(
        ({ colors }) => colors.tabBackgroundSelected
      )};
      color: ${tmHCDark(({ colors }) => colors.neutral400)};
    }
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral600)};
      background-color: ${tmDark(({ colors }) => colors.tabBackground)};
      &:hover {
        background-color: ${tmDark(({ colors }) => colors.tabBackgroundHover)};
        color: ${tmDark(({ colors }) => colors.neutral400)};
      }
      &[data-selected="true"] {
        background-color: ${tmDark(
          ({ colors }) => colors.tabBackgroundSelected
        )};
        color: ${tmDark(({ colors }) => colors.neutral400)};
      }
    }
  }
`;

const StyledTabsContainer = styled.div`
  display: flex;
  width: 100%;
  overflow-x: scroll;
  &::-webkit-scrollbar {
    display: none;
  }
  & > div {
    margin-right: 8px;
    &:last-child {
      margin-right: unset;
    }
  }
`;

const StyledTabsGroup = styled.div<{ selectedTab: string }>`
  margin-top: 28px;
  width: 100%;
  position: relative;
`;

const TabsGroup = ({ children, options, type }: ITabsGroup) => {
  const { tabsState, changeTab } = useContext(GlobalTabsContext);
  const selectedTab = tabsState[type];

  const childrenWithProps = React.Children.map(children, (child) => {
    // Checking isValidElement is the safe way and avoids a typescript
    // error too.
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { type });
    }
    return child;
  });

  return (
    <StyledTabsGroup selectedTab={selectedTab}>
      <StyledTabsContainer>
        {options.split(",").map((option: string) => {
          return (
            <StyledTabButton
              key={option}
              data-selected={selectedTab === option}
              value={option}
              onClick={() => {
                changeTab(type, option);
              }}
            >
              {option}
            </StyledTabButton>
          );
        })}
      </StyledTabsContainer>
      {childrenWithProps}
    </StyledTabsGroup>
  );
};

export default TabsGroup;

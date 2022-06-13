import React, { useCallback, useEffect, useMemo, useState } from "react";
import tabsConfig from "../temp/tabsConfig.json";

type TabType = string;

export interface ITabsState {
  [key: TabType]: string;
}

interface ITabsContext {
  tabsState: ITabsState;
  changeTab: (type: string, value: string) => void;
  setTabsState: React.Dispatch<React.SetStateAction<ITabsState>>;
}

export const GlobalTabsContext = React.createContext<ITabsContext>({
  tabsState: {},
  changeTab: () => {},
  setTabsState: () => {},
});

export const generateTabsGroupType = (options: string): string => {
  return options
    .split(",")
    .map((option) => option.trim())
    .join("/");
};

export const TabsProvider = ({
  children,
}: React.PropsWithChildren<{}>): JSX.Element => {
  const [tabsState, setTabsState] = useState<ITabsState>(tabsConfig);

  const changeTab = useCallback(
    (type, value) => {
      const newTabsState = {
        ...tabsState,
        [type]: value,
      };
      setTabsState(newTabsState);
    },
    [tabsState, setTabsState]
  );

  useEffect(() => {
    const savedTabsState = localStorage.getItem("tabs");
    if (savedTabsState === null) return;

    setTabsState({
      ...tabsConfig,
      ...JSON.parse(savedTabsState),
    });
  }, []);

  useEffect(() => {
    localStorage.setItem("tabs", JSON.stringify(tabsState));
  }, [tabsState]);

  const initialContext = useMemo(
    () => ({ tabsState, changeTab, setTabsState }),
    [tabsState, changeTab, setTabsState]
  );

  return (
    <GlobalTabsContext.Provider value={initialContext}>
      {children}
    </GlobalTabsContext.Provider>
  );
};

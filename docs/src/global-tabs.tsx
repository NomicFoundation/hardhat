import React, { useCallback, useEffect, useMemo, useState } from "react";

type TabType = string;

interface ISelectedTabsState {
  [key: TabType]: string;
}

interface ITabsContext {
  tabsState: ISelectedTabsState;
  changeTab: (type: string, value: string) => void;
  setTabsState: React.Dispatch<React.SetStateAction<ISelectedTabsState>>;
}

export const GlobalTabsContext = React.createContext<ITabsContext>({
  tabsState: {},
  changeTab: () => {},
  setTabsState: () => {},
});

export const generateTabsGroupType = (options: string): string => {
  return options.split(",").sort().join("/");
};

export const TabsProvider = ({
  children,
}: React.PropsWithChildren<{}>): JSX.Element => {
  const [tabsState, setTabsState] = useState<ISelectedTabsState>({});

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

    setTabsState(JSON.parse(savedTabsState));
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

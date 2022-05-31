import { useEffect, useState } from "react";

export interface WindowSizeState {
  width: number;
  height: number;
}

function handleResize({
  setWindowSize,
  windowObject,
}: {
  setWindowSize: (state: WindowSizeState) => void;
  windowObject: Window;
}) {
  setWindowSize({
    width: windowObject.innerWidth,
    height: windowObject.innerHeight,
  });
}

export default function useWindowSize(): WindowSizeState {
  const [windowSize, setWindowSize] = useState<WindowSizeState>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const listener = () =>
        handleResize({ setWindowSize, windowObject: window });

      window.addEventListener("resize", listener);

      handleResize({ setWindowSize, windowObject: window });

      return () => {
        window.removeEventListener("resize", listener);
      };
    }
    return () => {};
  }, []);

  return windowSize;
}

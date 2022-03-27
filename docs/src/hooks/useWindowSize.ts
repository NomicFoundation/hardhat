import { useEffect, useState } from "react";

interface WindowSizeState {
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
      window.addEventListener("resize", () =>
        handleResize({ setWindowSize, windowObject: window })
      );

      handleResize({ setWindowSize, windowObject: window });

      return () => window.removeEventListener("resize", () => handleResize);
    }
  }, []);

  return windowSize;
}

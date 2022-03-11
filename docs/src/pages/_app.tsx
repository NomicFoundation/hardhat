import type { AppProps } from "next/app";

import "../styles/globals.css";
import { ThemeProvider, appTheme } from "../themes";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider theme={appTheme}>
      <Component {...pageProps} />
    </ThemeProvider>
  );
}

export default MyApp;

import type { AppProps } from "next/app";
import LandingLayout from "../components/LandingLayout";

import "../styles/globals.css";
import { ThemeProvider, appTheme } from "../themes";

function MyApp({ Component, pageProps }: AppProps) {
  /* @ts-ignore */
  if (Component.layout !== "landing") {
    return (
      <div style={{ padding: 58 }}>
        <Component {...pageProps} />
      </div>
    );
  }
  return (
    <ThemeProvider theme={appTheme}>
      <LandingLayout seo={{ title: "Hardhat", description: "Hardhat" }}>
        <Component {...pageProps} />
      </LandingLayout>
    </ThemeProvider>
  );
}

export default MyApp;

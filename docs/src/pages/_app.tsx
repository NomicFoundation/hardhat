import type { AppProps } from "next/app";
import { MDXProvider } from "@mdx-js/react";
import LandingLayout from "../components/LandingLayout";
import "../styles/globals.css";
import { ThemeProvider, appTheme } from "../themes";
import DocumentationLayout from "../components/DocumentationLayout";

function MyApp({ Component, pageProps }: AppProps) {
  /* @ts-ignore */
  if (Component.layout !== "landing") {
    return (
      <ThemeProvider theme={appTheme}>
        <DocumentationLayout
          seo={{ title: "Overview", description: "Hardhat" }}
        >
          <MDXProvider components={{}}>
            <Component {...pageProps} />
          </MDXProvider>
        </DocumentationLayout>
      </ThemeProvider>
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

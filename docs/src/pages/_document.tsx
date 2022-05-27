/* eslint-disable react/no-danger */
import { Html, Head, Main, NextScript } from "next/document";

const MeasurementID = process.env.NEXT_PUBLIC_MEASUREMENT_ID as string;

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link
          rel="preload"
          href="/fonts/Chivo-Bold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="true"
        />
        <link
          rel="preload"
          href="/fonts/Chivo-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="true"
        />
        <link
          rel="preload"
          href="/fonts/Chivo-Light.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="true"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${MeasurementID}');

            `,
          }}
        />
      </Head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
          const theme = localStorage.getItem('theme') || 'AUTO';
          document.body.className = theme;`,
          }}
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

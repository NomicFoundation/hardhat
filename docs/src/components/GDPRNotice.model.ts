/* eslint-disable import/prefer-default-export */
const MeasurementID = process.env.NEXT_PUBLIC_MEASUREMENT_ID as string;

export const loadAnalyticsScript = () => {
  const existingScript = document.querySelector("#google-tag-manager");
  if (existingScript) {
    return;
  }

  const script = document.createElement("script");
  script.id = "google-tag-manager";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MeasurementID}`;
  document.head.appendChild(script);
};

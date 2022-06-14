import React from "react";
import { styled } from "linaria/react";
import CookiePopUp from "./CookiePopUp";
import { GDPR } from "../config";
import { loadAnalyticsScript } from "./GDPRNotice.model";

enum GDPRStatus {
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  UNKNOWN = "unknown",
}

const ITEM_KEY = "GDPR_ACCEPTED";

const Container = styled.div`
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 101;
`;

const useGDPR = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const acceptedStatus = (localStorage.getItem(ITEM_KEY) ??
      GDPRStatus.UNKNOWN) as GDPRStatus;
    if (acceptedStatus === GDPRStatus.UNKNOWN) {
      setIsOpen(true);
    }
    if (acceptedStatus === GDPRStatus.ACCEPTED) {
      loadAnalyticsScript();
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(ITEM_KEY, GDPRStatus.ACCEPTED);
    setIsOpen(false);
    loadAnalyticsScript();
  };

  const handleReject = () => {
    localStorage.setItem(ITEM_KEY, GDPRStatus.REJECTED);
    setIsOpen(false);
  };

  return {
    isOpen,
    handleAccept,
    handleReject,
  };
};

const GDPRNotice = () => {
  const manageGDPR = useGDPR();

  if (!manageGDPR.isOpen) {
    return null;
  }

  return (
    <Container className="gdpr-notice">
      <CookiePopUp
        {...GDPR}
        onAccept={manageGDPR.handleAccept}
        onReject={manageGDPR.handleReject}
      />
    </Container>
  );
};

export default GDPRNotice;

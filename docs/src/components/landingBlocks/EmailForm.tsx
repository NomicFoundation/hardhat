import React, { useState, FormEvent } from "react";
import { styled } from "linaria/react";
import Section from "../Section";
import LandingContainer from "../LandingContainer";
import { media, tm, tmDark, tmSelectors } from "../../themes";
import backgroundImageLight from "../../assets/email-form/bg-light-big.svg";
import backgroundImageDark from "../../assets/email-form/bg-dark-big.svg";
import Lines from "../../assets/email-form/lines";

// Props interface for the component
export interface EmailFormProps {
  endpoint: string;
}

// Styled components
const FormSection = styled.section`
  position: relative;
  width: 100%;

  padding: 162px 0;
  background: transparent;
  overflow: hidden;
  margin-top: 100px;
  ${media.tablet} {
    padding: 242px 0;
  }
  ${media.laptop} {
    padding: 529px 0;
    margin-top: 0;
  }
  ${media.desktop} {
    padding: 690px 0;
  }
`;

const BackgroundImage = styled.div<{ image: string; imageDark: string }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
  background-image: ${(props) => `url(${props.image})`};
  background-size: auto 660px;
  background-position: center;
  background-repeat: no-repeat;
  ${tmSelectors.dark} {
    background-image: ${(props) => `url(${props.imageDark})`};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-image: ${(props) => `url(${props.imageDark})`};
    }
  }
  ${media.tablet} {
    background-size: auto 860px;
  }
  ${media.laptop} {
    background-size: auto 100%;
  }
`;

const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 352px;
  margin: 0 auto;
  gap: 16px;
  padding-top: 48px;
  ${media.tablet} {
    gap: 32px;
    max-width: 377px;
  }
  ${media.laptop} {
    max-width: 665px;
    padding-top: 0;
  }
`;

const FormTitle = styled.h2`
  font-family: "Source Code Pro", monospace;
  font-size: 18px;
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: 0.045em;
  margin: 0;
  text-align: center;
  color: ${tm(({ colors }) => colors.gray9)};

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.gray8b)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.gray8b)};
    }
  }
  ${media.tablet} {
    font-size: 20px;
  }
  ${media.laptop} {
    text-align: left;
    font-size: 31px;
  }
  ${media.desktop} {
    font-size: 39px;
  }
`;

const FormRow = styled.form`
  display: flex;
  width: 100%;
  max-width: 665px;
  gap: 32px;
  flex-direction: column;
  align-items: center;
  ${media.laptop} {
    flex-direction: row;
  }
`;

const InputContainer = styled.div`
  position: relative;
  width: 100%;

  ${media.laptop} {
    flex: 1;
    width: auto;
  }
`;

const Input = styled.input`
  width: 100%;
  height: 56px;
  padding: 0 24px;
  background-color: ${tm(({ colors }) => colors.neutral100)};
  border: 1px solid ${tm(({ colors }) => colors.neutral700)};
  font-family: "Source Code Pro", monospace;
  font-size: 16px;
  line-height: 30px;
  letter-spacing: 0.03em;
  color: ${tm(({ colors }) => colors.base100)};
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: ${tm(({ colors }) => colors.base400)};
  }

  &:focus {
    border-color: #5e21ff !important;
    background-color: #5e21ff !important;
    color: #fff !important;
    &::placeholder {
      opacity: 0;
    }
  }

  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.gray3)};
    color: #fbfbfb;
    border-color: #4a4d54;

    &::placeholder {
      color: ${tmDark(({ colors }) => colors.gray5)};
    }
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.gray3)};
      color: #fbfbfb;
      border-color: #4a4d54;

      &::placeholder {
        color: ${tmDark(({ colors }) => colors.gray5)};
      }
    }
  }
  ${media.tablet} {
    font-size: 20px;
  }
`;

const Button = styled.button`
  height: 44px;
  min-width: 120px;
  padding: 0 28px;
  background-color: ${tm(({ colors }) => colors.accent800)};
  color: ${tm(({ colors }) => colors.base100)};
  font-family: "Roboto", sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 24px;
  letter-spacing: 0.01em;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  position: relative;

  &:hover {
    background-color: ${tm(({ colors }) => colors.accent600)};
  }

  &:disabled {
    background-color: ${tm(({ colors }) => colors.neutral400)};
    cursor: not-allowed;
  }

  ${tmSelectors.dark} {
    color: ${tm(({ colors }) => colors.base100)};

    &:hover {
      background-color: ${tm(({ colors }) => colors.accent600)};
    }
  }
  ${media.laptop} {
    height: 56px;
    font-size: 16px;
    min-width: 140px;
  }
`;

const ErrorMessage = styled.div`
  position: absolute;
  bottom: -24px;
  left: 0;
  color: red;
  font-size: 14px;
  font-family: "Source Code Pro", monospace;
`;

const SuccessMessage = styled.div`
  margin-top: 16px;
  color: ${tm(({ colors }) => colors.tipBorderColor)};
  font-size: 16px;
  font-family: "Source Code Pro", monospace;
  text-align: center;
`;

const LinesContainer = styled.div`
  margin-left: auto;
  margin-right: auto;
  width: max-content;
  position: absolute;
  top: 0;
  left: 50%;
  margin-left: -24px;
  .lines {
    stroke: #ededee;
  }
  ${tmSelectors.dark} {
    .lines {
      stroke: #1c1f23;
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      .lines {
        stroke: #1c1f23;
      }
    }
  }
`;

const EmailForm: React.FC<EmailFormProps> = ({ endpoint }) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateEmail = (e: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(e);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Reset states
    setError("");
    setIsSuccess(false);

    // Validate email
    if (!email.trim()) {
      setError("Email address is required");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit email");
      }

      // Success
      setEmail("");
      setIsSuccess(true);
    } catch (err) {
      console.error("Error submitting email:", err);
      setError("Failed to submit. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Section clearPadding>
      <LinesContainer>
        <Lines />
      </LinesContainer>
      <FormSection>
        <LandingContainer>
          <BackgroundImage
            image={backgroundImageLight.src}
            imageDark={backgroundImageDark.src}
          />
          <FormContainer>
            <FormTitle>
              Tell me about new product features as they come out
            </FormTitle>
            <FormRow>
              <InputContainer>
                <Input
                  type="email"
                  placeholder="email address*"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  aria-label="Email address"
                />
                {error && <ErrorMessage>{error}</ErrorMessage>}
              </InputContainer>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Get started"}
              </Button>
            </FormRow>
            {isSuccess && (
              <SuccessMessage>
                Thank you! You are now subscribed to our updates.
              </SuccessMessage>
            )}
          </FormContainer>
        </LandingContainer>
      </FormSection>
    </Section>
  );
};

export default EmailForm;

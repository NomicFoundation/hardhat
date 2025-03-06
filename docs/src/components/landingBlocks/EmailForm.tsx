import React, { useState, FormEvent } from "react";
import { styled } from "linaria/react";
import Section from "../Section";
import LandingContainer from "../LandingContainer";
import { media, tm, tmSelectors } from "../../themes";
import backgroundImageLight from "../../assets/email-form/bg-light-big.svg";

// Props interface for the component
interface EmailFormProps {
  endpoint: string;
}

// Styled components
const FormSection = styled.section`
  position: relative;
  width: 100%;
  padding: 690px 0 690px;
  background: transparent;
  overflow: hidden;
`;

const BackgroundImage = styled.div<{ image: string }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  background-image: ${(props) => `url(${props.image})`};
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
`;

const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 665px;
  margin: 0 auto;
  gap: 32px;

  ${media.sm} {
    gap: 24px;
  }

  ${media.tablet} {
    padding: 0;
  }
`;

const FormTitle = styled.h2`
  font-family: "Source Code Pro", monospace;
  font-size: 39px;
  font-weight: 500;
  line-height: 54.6px;
  letter-spacing: 0.05em;
  text-align: center;
  margin: 0;
  color: ${tm(({ colors }) => colors.base100)};

  ${tmSelectors.dark} {
    color: ${tm(({ colors }) => colors.base100)};
  }
`;

const FormRow = styled.form`
  display: flex;
  width: 100%;
  max-width: 665px;
  gap: 32px;
`;

const InputContainer = styled.div`
  flex: 1;
  position: relative;
`;

const Input = styled.input`
  width: 100%;
  height: 56px;
  padding: 0 24px;
  background-color: ${tm(({ colors }) => colors.neutral100)};
  border: 1px solid ${tm(({ colors }) => colors.neutral700)};
  font-family: "Source Code Pro", monospace;
  font-size: 20px;
  line-height: 30px;
  letter-spacing: 0.02em;
  color: ${tm(({ colors }) => colors.base100)};
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: ${tm(({ colors }) => colors.base400)};
  }

  &:focus {
    border-color: ${tm(({ colors }) => colors.accent800)};
  }

  ${tmSelectors.dark} {
    background-color: ${tm(({ colors }) => colors.neutral200)};
    color: ${tm(({ colors }) => colors.base100)};

    &::placeholder {
      color: ${tm(({ colors }) => colors.base400)};
    }

    &:focus {
      border-color: ${tm(({ colors }) => colors.accent800)};
    }
  }
`;

const Button = styled.button`
  height: 56px;
  min-width: 140px;
  padding: 0 28px;
  background-color: ${tm(({ colors }) => colors.accent800)};
  color: ${tm(({ colors }) => colors.base100)};
  font-family: "Roboto", sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  letter-spacing: -0.01em;
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
      <FormSection>
        <LandingContainer>
          <BackgroundImage image={backgroundImageLight.src} />
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

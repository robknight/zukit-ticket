import { EdDSATicketFieldsToReveal } from "@pcd/zk-eddsa-event-ticket-pcd";
import { ReactNode, useCallback, useContext } from "react";
import styled from "styled-components";
import { ZupassContext } from "./ZupassProvider";

export interface ZupassLoginButtonProps {
  fieldsToReveal: EdDSATicketFieldsToReveal;
  watermark: bigint;
  externalNullifier: bigint;
  validEventIds: string[];
  /** CSS class for the button. Overrides default styling. */
  className?: string;
}

export function ZupassLoginButton({
  fieldsToReveal,
  watermark,
  externalNullifier,
  className
}: ZupassLoginButtonProps) {
  const { state, startReq, passportServerURL } = useContext(ZupassContext);

  const login = useCallback(async () => {
    console.log("[ZUKIT] logging in...");
    startReq({ type: "login", watermark, externalNullifier, fieldsToReveal });
  }, [startReq, watermark, fieldsToReveal, externalNullifier]);

  const logout = useCallback(() => {
    console.log("[ZUKIT] logging out...");
    startReq({ type: "logout" });
  }, [startReq]);

  const Elem = className != null ? customButton(className) : Btn;

  switch (state.status) {
    case "logged-in": {
      const label = state.pcd.claim.partialTicket.attendeeName
        ? text("🕶️", "Welcome, anon")
        : text("👓", state.pcd.claim.partialTicket.attendeeName as string);
      return <Elem onClick={logout}>{label}</Elem>;
    }
    case "logged-out": {
      const label = !fieldsToReveal.revealAttendeeName
        ? text("🕶️", "Log in anonymously")
        : text("👓", "Log in with Zupass");
      return <Elem onClick={login}>{label}</Elem>;
    }
    case "logging-in": {
      return <Elem disabled>Logging in...</Elem>;
    }
  }
}

function customButton(className: string) {
  return function CustomBtn(props: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) {
    return (
      <button className={className} {...props}>
        {props.children}
      </button>
    );
  };
}

function text(emoji: string, text: string) {
  const msp = "\u2003"; // 1em space
  return `${emoji}${msp}${text}`;
}

const Btn = styled.button`
  background: #fff;
  border-radius: 0.75rem;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0px 0.25rem 0.75rem rgba(0, 0, 0, 0.1);
  border: none;
  min-width: 12rem;
  min-height: 3rem;

  &:hover {
    background: #fafafa;
  }

  &:active {
    background: #f8f8f8;
  }

  &:disabled {
    background: #f8f8f8;
    cursor: default;
  }
`;

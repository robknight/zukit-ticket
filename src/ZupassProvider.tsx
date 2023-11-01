import { SerializedPCD } from "@pcd/pcd-types";
import { SerializedSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import {
  EdDSATicketFieldsToReveal,
  ZKEdDSAEventTicketPCDPackage
} from "@pcd/zk-eddsa-event-ticket-pcd";
import * as React from "react";
import { ReactNode, createContext, useEffect, useState } from "react";
import { useZupassPopupMessages } from "./PassportPopup";
import { ZupassState, parseAndValidate, serialize } from "./state";
import { openZKEdDSAEventTicketPopup } from "./zkTicketPopup";

export type ZupassReq =
  | {
      type: "logout";
    }
  | {
      type: "login";
      watermark: bigint;
      externalNullifier: bigint;
      fieldsToReveal: EdDSATicketFieldsToReveal;
    };

export interface ZupassContextVal {
  passportServerURL?: string;
  state: ZupassState;
  startReq: (request: ZupassReq) => void;
}

export const ZupassContext = createContext<ZupassContextVal>({
  state: { status: "logged-out" },
  startReq: () => {}
});

export interface ZupassProviderProps {
  children: ReactNode;
  /** Passport API server, for loading participants and semaphore groups */
  passportServerURL?: string;
  /** Passport UI, for requesting proofs */
  passportClientURL?: string;
  /** Local app popup URL. Redirects to passport, returns resulting PCD. */
  popupURL?: string;
}

export function ZupassProvider(props: ZupassProviderProps) {
  // Read state from local storage on page load
  const [state, setState] = useState<ZupassState>({ status: "logged-out" });
  useEffect(() => {
    readFromLocalStorage().then(setAndWriteState);
  }, []);

  // Write state to local storage whenever a login starts, succeeds, or fails
  const setAndWriteState = (newState: ZupassState) => {
    console.log(`[ZUKIT] new state ${shallowToString(newState)}`);
    setState(newState);
    writeToLocalStorage(newState);
  };

  // Configure passport
  const passportServerURL = validateURL(
    props.passportServerURL,
    "passportServerURL",
    "https://api.zupass.org"
  );
  const passportClientURL = validateURL(
    props.passportClientURL,
    "passportClientURL",
    "https://zupass.org"
  );
  const popupURL = validateURL(
    props.popupURL,
    "popupURL",
    typeof window === "undefined"
      ? "http://url.invalid"
      : window.location.origin + "/popup"
  );

  // Send login requests to passport
  const startReq = React.useCallback(
    (request: ZupassReq) => {
      console.log(`[ZUKIT] startReq ${shallowToString(request)}`);
      setAndWriteState(handleLoginReq(request, passportClientURL, popupURL));
    },
    [setAndWriteState, passportClientURL, popupURL]
  );

  // Receive PCDs from passport popup
  const [pcdStr] = useZupassPopupMessages();
  React.useEffect(() => {
    if (pcdStr === "") return;
    console.log(`[ZUKIT] trying to log in with ${pcdStr.substring(0, 40)}...`);
    handleLogin(state, pcdStr)
      .then((newState) => {
        if (newState) setAndWriteState(newState);
        else console.log(`[ZUKIT] ${state.status}, ignoring pcd: ${pcdStr}`);
      })
      .catch((e: unknown) => {
        console.error(e);
        console.error(`[ZUKIT] error logging in, ignoring pcd: ${pcdStr}`);
      });
  }, [pcdStr]);

  // Provide context
  const val = React.useMemo(
    () => ({ passportServerURL, state, startReq }),
    [passportServerURL, state, startReq]
  );

  return (
    <ZupassContext.Provider value={val}>
      {props.children}
    </ZupassContext.Provider>
  );
}

/** Reads and validates stored state. Otherwise, returns a logged-out state. */
async function readFromLocalStorage(): Promise<ZupassState> {
  const json = window.localStorage["zukit-ticket"];
  try {
    const state = await parseAndValidate(json);
    console.log(`[ZUKIT] read stored state: ${shallowToString(state)}`);
    return state;
  } catch (e) {
    console.error(`[ZUKIT] error parsing stored state: ${e}`);
    return { status: "logged-out" };
  }
}

function writeToLocalStorage(state: ZupassState) {
  console.log(`[ZUKIT] writing to local storage, status ${state.status}`);
  window.localStorage["zukit-ticket"] = serialize(state);
}

/** Pops up the passport, requesting a login. Returns a `logging-in` state */
function handleLoginReq(
  request: ZupassReq,
  zupassServerURL: string,
  popupURL: string
): ZupassState {
  const { type } = request;
  switch (type) {
    case "login":
      openZKEdDSAEventTicketPopup(
        popupURL,
        zupassServerURL,
        request.fieldsToReveal,
        [],
        [],
        request.watermark,
        request.externalNullifier
      );

      return {
        status: "logging-in",
        request
      };
    case "logout":
      return { status: "logged-out" };

    default:
      throw new Error(`Invalid request type ${type}`);
  }
}

/** Returns either a `logged-in` state, null to ignore, or throws on error. */
async function handleLogin(
  state: ZupassState,
  pcdStr: string
): Promise<ZupassState | null> {
  if (state.status !== "logging-in") {
    console.log(`[ZUKIT] ignoring message. State != logging-in: ${state}`);
    return null;
  }
  const serializedPCD = JSON.parse(pcdStr) as SerializedPCD;
  const pcd = await ZKEdDSAEventTicketPCDPackage.deserialize(serializedPCD.pcd);

  if (!(await ZKEdDSAEventTicketPCDPackage.verify(pcd))) {
    throw new Error("Invalid proof");
  }

  // @todo compare with request

  return {
    status: "logged-in",
    pcd,
    serializedPCD
  };
}

/** Given {foo:1, bar: [1,2,...]} returns '{"foo":1,"bar":"<array>"}' */
function shallowToString(obj: any) {
  return JSON.stringify(obj, function (key: string, val: any) {
    if (key === "") return val;
    if (val == null) return null;
    if (typeof val === "bigint") return "" + val;
    if (Array.isArray(val)) return "<array>";
    if (typeof val === "object") return "<object>";
    return val;
  });
}

/** Validates a URL config option, with fallback to a default value */
function validateURL(
  configURL: string | undefined,
  name: string,
  defaultURL: string
): string {
  const ret = configURL || defaultURL;
  const u = new URL(ret);
  if (!["http:", "https:"].includes(u.protocol)) {
    throw new Error("Invalid " + name);
  }
  return ret;
}

async function fetchGroup(groupURL: string): Promise<SerializedSemaphoreGroup> {
  const r = await fetch(groupURL);
  if (!r.ok) {
    throw new Error(`Failed to fetch ${groupURL}. Got HTTP ${r.status}`);
  }
  return r.json();
}

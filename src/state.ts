import { SerializedPCD } from "@pcd/pcd-types";
import {
  ZKEdDSAEventTicketPCD,
  ZKEdDSAEventTicketPCDPackage
} from "@pcd/zk-eddsa-event-ticket-pcd";
import { ZupassReq } from "./ZupassProvider";

export type ZupassState = {
  /** Whether the user is logged in. @see ZupassLoginButton */
  status: "logged-out" | "logged-in" | "logging-in";
} & (
  | {
      status: "logged-out";
    }
  | {
      status: "logging-in";
      request: ZupassReq;
    }
  | {
      status: "logged-in";
      pcd: ZKEdDSAEventTicketPCD;
      serializedPCD: SerializedPCD<ZKEdDSAEventTicketPCD>;
    }
);

type StateV1 = {
  version: 1;
  status: "logged-out" | "logged-in";
  serializedPCD?: SerializedPCD;
};

export async function parseAndValidate(json?: string): Promise<ZupassState> {
  if (json == null || json.trim() === "") {
    return { status: "logged-out" };
  }

  const stored = JSON.parse(json) as StateV1;
  if (stored.version !== 1) {
    throw new Error(`Invalid state version ${stored.version}`);
  }

  // Validate status
  if (!["logged-out", "logged-in"].includes(stored.status)) {
    throw new Error(`Invalid status ${stored.status}`);
  }

  if (stored.status === "logged-out") {
    return { status: stored.status };
  }

  // Parse and validate PCD and accompanying metadata.
  if (!stored.serializedPCD) {
    throw new Error(`Missing serialized PCD`);
  }

  const pcd = await ZKEdDSAEventTicketPCDPackage.deserialize(
    stored.serializedPCD.pcd
  );

  return {
    status: "logged-in",
    pcd,
    serializedPCD: stored.serializedPCD
  };
}

export function serialize(state: ZupassState): string {
  const { status } = state;
  let serState: StateV1;
  if (status === "logged-in") {
    serState = {
      version: 1,
      status,
      serializedPCD: state.serializedPCD
    };
  } else {
    serState = {
      version: 1,
      status: "logged-out"
    };
  }
  return JSON.stringify(serState);
}

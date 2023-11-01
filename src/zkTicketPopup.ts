import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  EdDSATicketFieldsToReveal,
  ZKEdDSAEventTicketPCDArgs,
  ZKEdDSAEventTicketPCDPackage
} from "@pcd/zk-eddsa-event-ticket-pcd";
import { constructZupassPcdGetRequestUrl } from "./PassportInterface";
import { openZupassPopup } from "./PassportPopup";

/**
 * Opens a Zupass popup to make a proof of a ZK EdDSA event ticket PCD.
 */
export function openZKEdDSAEventTicketPopup(
  zupassServerUrl: string,
  popupUrl: string,
  fieldsToReveal: EdDSATicketFieldsToReveal,
  validEventIds: string[],
  validProductIds: string[],
  watermark?: bigint,
  externalNullifier?: bigint
) {
  const args: ZKEdDSAEventTicketPCDArgs = {
    ticket: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: EdDSATicketPCDPackage.name,
      value: undefined,
      userProvided: true,
      validatorParams: {
        eventIds: validEventIds,
        productIds: validProductIds,
        notFoundMessage: "No eligible PCDs found"
      }
    },
    identity: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: SemaphoreIdentityPCDPackage.name,
      value: undefined,
      userProvided: true
    },
    validEventIds: {
      argumentType: ArgumentTypeName.StringArray,
      value: validEventIds.length != 0 ? validEventIds : undefined,
      userProvided: false
    },
    fieldsToReveal: {
      argumentType: ArgumentTypeName.ToggleList,
      value: fieldsToReveal,
      userProvided: false
    },
    watermark: {
      argumentType: ArgumentTypeName.BigInt,
      value: watermark ? watermark.toString() : "0",
      userProvided: false
    },
    externalNullifier: {
      argumentType: ArgumentTypeName.BigInt,
      value: externalNullifier
        ? externalNullifier.toString()
        : watermark
        ? watermark.toString()
        : "0",
      userProvided: false
    }
  };

  const proofUrl = constructZupassPcdGetRequestUrl<
    typeof ZKEdDSAEventTicketPCDPackage
  >(zupassServerUrl, popupUrl, ZKEdDSAEventTicketPCDPackage.name, args, {
    genericProveScreen: true,
    title: "ZKEdDSA Ticket Proof",
    description: "ZKEdDSA Ticket PCD Request"
  });

  openZupassPopup(popupUrl, proofUrl);
}

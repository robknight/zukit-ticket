import { ArgsOf, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { sha256 } from "js-sha256";

export enum PCDRequestType {
  Get = "Get",
  GetWithoutProving = "GetWithoutProving",
  Add = "Add",
  ProveAndAdd = "ProveAndAdd"
}

export interface PCDRequest {
  returnUrl: string;
  type: PCDRequestType;
}

export interface ProveOptions {
  genericProveScreen?: boolean;
  title?: string;
  description?: string;
  debug?: boolean;
  proveOnServer?: boolean;
  signIn?: boolean;
}

/**
 * When a website uses the Zupass for signing in, Zupass
 * signs this payload using a `SemaphoreSignaturePCD`.
 */
export interface SignInMessagePayload {
  uuid: string;
  referrer: string;
}

export interface PCDGetRequest<T extends PCDPackage = PCDPackage>
  extends PCDRequest {
  type: PCDRequestType.Get;
  pcdType: T["name"];
  args: ArgsOf<T>;
  options?: ProveOptions;
}

export interface PCDGetWithoutProvingRequest extends PCDRequest {
  pcdType: string;
}

export interface PCDAddRequest extends PCDRequest {
  type: PCDRequestType.Add;
  pcd: SerializedPCD;
}

export interface PCDProveAndAddRequest<T extends PCDPackage = PCDPackage>
  extends PCDRequest {
  type: PCDRequestType.ProveAndAdd;
  pcdType: string;
  args: ArgsOf<T>;
  options?: ProveOptions;
  returnPCD?: boolean;
}

export function getWithoutProvingUrl(
  zupassClientUrl: string,
  returnUrl: string,
  pcdType: string
) {
  const req: PCDGetWithoutProvingRequest = {
    type: PCDRequestType.GetWithoutProving,
    pcdType,
    returnUrl
  };
  const encReq = encodeURIComponent(JSON.stringify(req));
  return `${zupassClientUrl}#/get-without-proving?request=${encReq}`;
}

export function constructZupassPcdGetRequestUrl<T extends PCDPackage>(
  zupassClientUrl: string,
  returnUrl: string,
  pcdType: T["name"],
  args: ArgsOf<T>,
  options?: ProveOptions
) {
  const req: PCDGetRequest<T> = {
    type: PCDRequestType.Get,
    returnUrl: returnUrl,
    args: args,
    pcdType,
    options
  };
  const encReq = encodeURIComponent(JSON.stringify(req));
  return `${zupassClientUrl}#/prove?request=${encReq}`;
}

export function constructZupassPcdAddRequestUrl(
  zupassClientUrl: string,
  returnUrl: string,
  pcd: SerializedPCD
) {
  const req: PCDAddRequest = {
    type: PCDRequestType.Add,
    returnUrl: returnUrl,
    pcd
  };
  const eqReq = encodeURIComponent(JSON.stringify(req));
  return `${zupassClientUrl}#/add?request=${eqReq}`;
}

export function constructZupassPcdProveAndAddRequestUrl<
  T extends PCDPackage = PCDPackage
>(
  zupassClientUrl: string,
  returnUrl: string,
  pcdType: string,
  args: ArgsOf<T>,
  options?: ProveOptions,
  returnPCD?: boolean
) {
  const req: PCDProveAndAddRequest = {
    type: PCDRequestType.ProveAndAdd,
    returnUrl: returnUrl,
    pcdType,
    args,
    options,
    returnPCD
  };
  const eqReq = encodeURIComponent(JSON.stringify(req));
  return `${zupassClientUrl}#/add?request=${eqReq}`;
}

export const getAnonTopicNullifier = (
  chatId: number,
  topicId: number
): bigint => {
  return BigInt(
    "0x" + sha256(JSON.stringify({ chatId, topicId })).substring(0, 16)
  );
};

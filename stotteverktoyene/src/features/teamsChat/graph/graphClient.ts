import {
  InteractionRequiredAuthError,
  type AccountInfo,
  type IPublicClientApplication,
} from "@azure/msal-browser";
import { graphScopes } from "../../../app/auth/msalConfig";

export type GraphScopes = string[];

async function acquireAccessToken(
  instance: IPublicClientApplication,
  account: AccountInfo,
  scopes: GraphScopes
): Promise<string> {
  try {
    const res = await instance.acquireTokenSilent({
      account,
      scopes,
    });

    return res.accessToken;
  } catch (error) {
    // If silent token acquisition requires user interaction (expired/revoked consent),
    // retry in a popup so the user can continue in-app.
    if (error instanceof InteractionRequiredAuthError) {
      const res = await instance.acquireTokenPopup({
        account,
        scopes,
      });

      return res.accessToken;
    }

    throw error;
  }
}

export async function graphGet<T>(
  instance: IPublicClientApplication,
  account: AccountInfo,
  url: string,
  scopes: GraphScopes = graphScopes.chatRead
): Promise<T> {
  const token = await acquireAccessToken(instance, account, scopes);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }

  return (await res.json()) as T;
}

export async function graphPost<T>(
  instance: IPublicClientApplication,
  account: AccountInfo,
  url: string,
  body: unknown,
  scopes: GraphScopes = graphScopes.chatReadWrite
): Promise<T> {
  const token = await acquireAccessToken(instance, account, scopes);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }

  // Some Graph endpoints can return 204; handle safely
  if (res.status === 204) return undefined as unknown as T;

  return (await res.json()) as T;
}

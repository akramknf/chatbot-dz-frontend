import { createAPIClient } from "./nhost-js/auth.es.js";
import { updateSessionFromResponseMiddleware, attachAccessTokenMiddleware, sessionRefreshMiddleware } from "./nhost-js/fetch.es.js";
import { createAPIClient as createAPIClient$3 } from "./nhost-js/functions.es.js";
import { createAPIClient as createAPIClient$2 } from "./nhost-js/graphql.es.js";
import { r as refreshSession } from "./refreshSession-WwGlzgtM.mjs";
import { detectStorage, SessionStorage } from "./nhost-js/session.es.js";
import { createAPIClient as createAPIClient$1 } from "./nhost-js/storage.es.js";
class NhostClient {
  /**
   * Authentication client providing methods for user sign-in, sign-up, and session management.
   * Use this client to handle all authentication-related operations.
   */
  auth;
  /**
   * Storage client providing methods for file operations (upload, download, delete).
   * Use this client to manage files in your Nhost storage.
   */
  storage;
  /**
   * GraphQL client providing methods for executing GraphQL operations against your Hasura backend.
   * Use this client to query and mutate data in your database through GraphQL.
   */
  graphql;
  /**
   * Functions client providing methods for invoking serverless functions.
   * Use this client to call your custom serverless functions deployed to Nhost.
   */
  functions;
  /**
   * Storage implementation used for persisting session information.
   * This handles saving, retrieving, and managing authentication sessions across requests.
   */
  sessionStorage;
  /**
   * Create a new Nhost client. This constructor is reserved for advanced use cases.
   * For typical usage, use [createClient](#createclient) or [createServerClient](#createserverclient) instead.
   *
   * @param auth - Authentication client instance
   * @param storage - Storage client instance
   * @param graphql - GraphQL client instance
   * @param functions - Functions client instance
   * @param sessionStorage - Storage implementation for session persistence
   */
  constructor(auth, storage, graphql, functions, sessionStorage) {
    this.auth = auth;
    this.storage = storage;
    this.graphql = graphql;
    this.functions = functions;
    this.sessionStorage = sessionStorage;
  }
  /**
   * Get the current session from storage.
   * This method retrieves the authenticated user's session information if one exists.
   *
   * @returns The current session or null if no session exists
   *
   * @example
   * ```ts
   * const session = nhost.getUserSession();
   * if (session) {
   *   console.log('User is authenticated:', session.user.id);
   * } else {
   *   console.log('No active session');
   * }
   * ```
   */
  getUserSession() {
    return this.sessionStorage.get();
  }
  /**
   * Refresh the session using the current refresh token
   * in the storage and update the storage with the new session.
   *
   * This method can be used to proactively refresh tokens before they expire
   * or to force a refresh when needed.
   *
   * @param marginSeconds - The number of seconds before the token expiration to refresh the session. If the token is still valid for this duration, it will not be refreshed. Set to 0 to force the refresh.
   *
   * @returns The new session or null if there is currently no session or if refresh fails
   *
   * @example
   * ```ts
   * // Refresh token if it's about to expire in the next 5 minutes
   * const refreshedSession = await nhost.refreshSession(300);
   *
   * // Force refresh regardless of current token expiration
   * const forcedRefresh = await nhost.refreshSession(0);
   * ```
   */
  async refreshSession(marginSeconds = 60) {
    return refreshSession(this.auth, this.sessionStorage, marginSeconds);
  }
  /**
   * Clear the session from storage.
   *
   * This method removes the current authentication session, effectively logging out the user.
   * Note that this is a client-side operation and doesn't invalidate the refresh token on
   * the server, which can be done with `nhost.auth.signOut({refreshToken: session.refreshTokenId})`.
   * If the middle `updateSessionFromResponseMiddleware` is used, the session will be removed
   * from the storage automatically and calling this method is not necessary.
   *
   * @example
   * ```ts
   * // Log out the user
   * nhost.clearSession();
   * ```
   */
  clearSession() {
    this.sessionStorage.remove();
  }
}
function createClient(options = {}) {
  const {
    subdomain,
    region,
    authUrl,
    storageUrl,
    graphqlUrl,
    functionsUrl,
    storage = detectStorage()
  } = options;
  const sessionStorage = new SessionStorage(storage);
  const authBaseUrl = generateServiceUrl("auth", subdomain, region, authUrl);
  const storageBaseUrl = generateServiceUrl(
    "storage",
    subdomain,
    region,
    storageUrl
  );
  const graphqlBaseUrl = generateServiceUrl(
    "graphql",
    subdomain,
    region,
    graphqlUrl
  );
  const functionsBaseUrl = generateServiceUrl(
    "functions",
    subdomain,
    region,
    functionsUrl
  );
  const auth = createAPIClient(authBaseUrl);
  const mwChain = getMiddlewareChain(auth, sessionStorage, true);
  for (const mw of mwChain) {
    auth.pushChainFunction(mw);
  }
  const storageClient = createAPIClient$1(storageBaseUrl, mwChain);
  const graphqlClient = createAPIClient$2(graphqlBaseUrl, mwChain);
  const functionsClient = createAPIClient$3(functionsBaseUrl, mwChain);
  return new NhostClient(
    auth,
    storageClient,
    graphqlClient,
    functionsClient,
    sessionStorage
  );
}
function createServerClient(options) {
  const {
    subdomain,
    region,
    authUrl,
    storageUrl,
    graphqlUrl,
    functionsUrl,
    storage
  } = options;
  const sessionStorage = new SessionStorage(storage);
  const authBaseUrl = generateServiceUrl("auth", subdomain, region, authUrl);
  const storageBaseUrl = generateServiceUrl(
    "storage",
    subdomain,
    region,
    storageUrl
  );
  const graphqlBaseUrl = generateServiceUrl(
    "graphql",
    subdomain,
    region,
    graphqlUrl
  );
  const functionsBaseUrl = generateServiceUrl(
    "functions",
    subdomain,
    region,
    functionsUrl
  );
  const auth = createAPIClient(authBaseUrl);
  const mwChain = getMiddlewareChain(auth, sessionStorage, false);
  for (const mw of mwChain) {
    auth.pushChainFunction(mw);
  }
  const storageClient = createAPIClient$1(storageBaseUrl, mwChain);
  const graphqlClient = createAPIClient$2(graphqlBaseUrl, mwChain);
  const functionsClient = createAPIClient$3(functionsBaseUrl, mwChain);
  return new NhostClient(
    auth,
    storageClient,
    graphqlClient,
    functionsClient,
    sessionStorage
  );
}
function getMiddlewareChain(auth, storage, autoRefresh) {
  const mwChain = [
    updateSessionFromResponseMiddleware(storage),
    attachAccessTokenMiddleware(storage)
  ];
  if (autoRefresh) {
    mwChain.unshift(sessionRefreshMiddleware(auth, storage));
  }
  return mwChain;
}
const generateServiceUrl = (serviceType, subdomain, region, customUrl) => {
  if (customUrl) {
    return customUrl;
  } else if (subdomain && region) {
    return `https://${subdomain}.${serviceType}.${region}.nhost.run/v1`;
  } else {
    return `https://local.${serviceType}.local.nhost.run/v1`;
  }
};
export {
  createClient,
  createServerClient,
  generateServiceUrl
};
//# sourceMappingURL=nhost-js.es.js.map

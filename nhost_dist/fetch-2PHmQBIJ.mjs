function createEnhancedFetch(chainFunctions = []) {
  return chainFunctions.reduceRight(
    (nextInChain, chainFunction) => chainFunction(nextInChain),
    fetch
  );
}
function extractMessage(body) {
  if (body && typeof body === "string") {
    return body;
  }
  if (body && typeof body === "object") {
    const typedBody = body;
    if ("message" in typedBody && typeof typedBody["message"] === "string") {
      return typedBody["message"];
    }
    if ("error" in typedBody && typeof typedBody["error"] === "string") {
      return typedBody["error"];
    }
    if ("error" in typedBody && typedBody["error"] && typeof typedBody["error"] === "object") {
      const error = typedBody["error"];
      if ("message" in error && typeof error["message"] === "string") {
        return error["message"];
      }
    }
    if ("errors" in typedBody && Array.isArray(typedBody["errors"])) {
      const messages = typedBody["errors"].filter(
        (error) => typeof error === "object" && error !== null && "message" in error && typeof error["message"] === "string"
      ).map((error) => error["message"]);
      if (messages.length > 0) {
        return messages.join(", ");
      }
    }
  }
  return "An unexpected error occurred";
}
class FetchError extends Error {
  /** The original response body */
  body;
  /** HTTP status code of the failed response */
  status;
  /** Response headers */
  headers;
  /**
   * Creates a new FetchError instance
   *
   * @param body - The response body from the failed request
   * @param status - The HTTP status code
   * @param headers - The response headers
   */
  constructor(body, status, headers) {
    super(extractMessage(body));
    this.body = body;
    this.status = status;
    this.headers = headers;
  }
}
export {
  FetchError as F,
  createEnhancedFetch as c
};
//# sourceMappingURL=fetch-2PHmQBIJ.mjs.map

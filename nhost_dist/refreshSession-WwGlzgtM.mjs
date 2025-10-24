class DummyLock {
  async request(_name, _options, callback) {
    return callback();
  }
}
const lock = typeof navigator !== "undefined" && navigator.locks ? navigator.locks : new DummyLock();
const refreshSession = async (auth, storage, marginSeconds = 60) => {
  try {
    return await _refreshSession(auth, storage, marginSeconds);
  } catch (error) {
    try {
      console.warn("error refreshing session, retrying:", error);
      return await _refreshSession(auth, storage, marginSeconds);
    } catch (error2) {
      const errResponse = error2;
      if (errResponse?.status === 401) {
        console.error("session probably expired");
        storage.remove();
      }
      return null;
    }
  }
};
const _refreshSession = async (auth, storage, marginSeconds = 60) => {
  const {
    session,
    needsRefresh
  } = await lock.request(
    "nhostSessionLock",
    { mode: "shared" },
    async () => {
      return _needsRefresh(storage, marginSeconds);
    }
  );
  if (!session) {
    return null;
  }
  if (!needsRefresh) {
    return session;
  }
  const refreshedSession = await lock.request(
    "nhostSessionLock",
    { mode: "exclusive" },
    async () => {
      const { session: session2, needsRefresh: needsRefresh2, sessionExpired } = _needsRefresh(
        storage,
        marginSeconds
      );
      if (!session2) {
        return null;
      }
      if (!needsRefresh2) {
        return session2;
      }
      try {
        const response = await auth.refreshToken({
          refreshToken: session2.refreshToken
        });
        storage.set(response.body);
        return response.body;
      } catch (error) {
        if (!sessionExpired) {
          return session2;
        }
        throw error;
      }
    }
  );
  return refreshedSession;
};
const _needsRefresh = (storage, marginSeconds = 60) => {
  const session = storage.get();
  if (!session) {
    return { session: null, needsRefresh: false, sessionExpired: false };
  }
  if (!session.decodedToken || !session.decodedToken.exp) {
    return { session, needsRefresh: true, sessionExpired: true };
  }
  if (marginSeconds === 0) {
    return { session, needsRefresh: true, sessionExpired: false };
  }
  const currentTime = Date.now();
  if (session.decodedToken.exp - currentTime > marginSeconds * 1e3) {
    return { session, needsRefresh: false, sessionExpired: false };
  }
  return {
    session,
    needsRefresh: true,
    sessionExpired: session.decodedToken.exp < currentTime
  };
};
export {
  refreshSession as r
};
//# sourceMappingURL=refreshSession-WwGlzgtM.mjs.map

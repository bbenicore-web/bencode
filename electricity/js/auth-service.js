async function dataOrThrow(request) {
  const { data, error } = await request;

  if (error) {
    throw error;
  }

  return data;
}

export function createAuthService(client) {
  return {
    async getSession() {
      const data = await dataOrThrow(client.auth.getSession());
      return data.session;
    },

    signUp(email, password) {
      return dataOrThrow(client.auth.signUp({ email, password }));
    },

    signIn(email, password) {
      return dataOrThrow(client.auth.signInWithPassword({ email, password }));
    },

    async signOut() {
      await dataOrThrow(client.auth.signOut());
    },

    onAuthStateChange(callback) {
      const { data } = client.auth.onAuthStateChange(callback);
      return data.subscription;
    }
  };
}

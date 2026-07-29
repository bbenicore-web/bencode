async function dataOrThrow(request) {
  const { data, error } = await request;

  if (error) {
    throw error;
  }

  return data;
}

export function createAuthService(client, { emailRedirectTo } = {}) {
  return {
    async getSession() {
      const data = await dataOrThrow(client.auth.getSession());
      return data.session;
    },

    signUp(email, password) {
      const credentials = { email, password };

      if (emailRedirectTo) {
        credentials.options = { emailRedirectTo };
      }

      return dataOrThrow(client.auth.signUp(credentials));
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

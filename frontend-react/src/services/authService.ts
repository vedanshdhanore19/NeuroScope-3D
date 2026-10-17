export const authService = {
  async login(email: string, password: string) {
    if (!email || !password) throw new Error('Email and password are required.');
    // Authentication is intentionally optional in the research prototype.
    return { authenticated: false, email };
  },
};

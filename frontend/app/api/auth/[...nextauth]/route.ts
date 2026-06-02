import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";

// Use the Google refresh_token to obtain a fresh id_token when the current one expires
async function refreshGoogleIdToken(token: JWT): Promise<JWT> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      }),
    });

    const refreshed = await res.json();
    if (!res.ok) throw refreshed;

    return {
      ...token,
      idToken: refreshed.id_token,
      expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
      // Google usually omits a new refresh_token on refresh; keep the existing one
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (error) {
    console.error("Failed to refresh Google id_token:", error);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // offline + consent ensures Google returns a refresh_token so we can keep
      // a fresh id_token for backend verification past the ~1h expiry
      authorization: { params: { access_type: 'offline', prompt: 'consent' } },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // User signed in successfully
      // Here we can save user to Cosmos DB
      console.log("User signed in:", user);

      // Send user info to backend to create/update user in Cosmos DB
      // Use email as the consistent identifier across all devices
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: user.email, // Use email as consistent identifier across devices
            email: user.email,
            name: user.name,
            image: user.image,
            provider: account?.provider,
          }),
        });

        if (!response.ok) {
          console.error('Failed to sync user to backend');
        }
      } catch (error) {
        console.error('Error syncing user to backend:', error);
      }

      return true;
    },
    async jwt({ token, user, account }) {
      // Add user info to JWT token
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }

      // On initial sign-in, persist Google tokens for backend verification
      if (account) {
        token.idToken = account.id_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at; // unix seconds
      }

      // Still valid (60s safety margin) → reuse
      const expiresAt = token.expiresAt as number | undefined;
      if (expiresAt && Date.now() / 1000 < expiresAt - 60) {
        return token;
      }

      // Expired → refresh the Google id_token using the refresh_token
      if (token.refreshToken) {
        return await refreshGoogleIdToken(token);
      }

      return token;
    },
    async session({ session, token }) {
      // Add user info to session
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }
      // Expose the (fresh) Google id_token so the client can authenticate to the backend
      (session as unknown as { idToken?: string }).idToken = token.idToken as string | undefined;
      (session as unknown as { error?: string }).error = token.error as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

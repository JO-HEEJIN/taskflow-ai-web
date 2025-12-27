import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // User signed in successfully
      // Here we can save user to Cosmos DB
      console.log("User signed in:", user);

      // Send user info to backend to create/update user in Cosmos DB
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: user.id,
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

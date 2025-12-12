import prisma from "@/libs/prisma";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      id: "credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "jsmith" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const userFound = await prisma.user.findUnique({
          where: { email: credentials?.email },
        });

        if (!userFound) throw new Error("Invalid Email");

        if (!userFound.password) throw new Error("Invalid credentials");

        const passwordMatch = await bcrypt.compare(
          credentials!.password,
          userFound.password,
        );

        if (!passwordMatch) throw new Error("Invalid Password");
        
        return {
          id: userFound.id,
          email: userFound.email,
          name: userFound.name,
          role: userFound.role,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days - matches session maxAge
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async jwt({ token, user, session, trigger }) {
      // Handle session updates
      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }

      if (trigger === "update" && session?.email) {
        token.email = session.email;
      }

      // Handle new login
      if (user) {
        const u = user as unknown as any;
        return {
          ...token,
          id: u.id,
          role: u.role,
        };
      }
      
      return token;
    },
    async session({ session, token }) {
      // Gracefully handle invalid/corrupted tokens
      try {
        // If token is missing critical data, return null to force logout
        if (!token?.id || !token?.email) {
          console.log("Invalid token detected, session will be cleared");
          return null as any;
        }
        
      return {
        ...session,
        user: {
          ...session.user,
          _id: token.id,
          name: token.name,
          role: token.role as string,
        },
      };
      } catch (error) {
        // Silently fail and clear session
        console.log("Session validation error, clearing session");
        return null as any;
      }
    },
  },
  events: {
    async signOut({ token }) {
      // Clean up any resources when user signs out
      console.log("User signed out:", token?.email);
    },
  },
};

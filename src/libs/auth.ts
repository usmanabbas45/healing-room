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
        // Normalize email to lowercase for case-insensitive login
        const normalizedEmail = credentials?.email?.toLowerCase().trim();
        
        const userFound = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!userFound) throw new Error("Invalid Email");

        if (!userFound.password) throw new Error("Invalid credentials");

        const passwordMatch = await bcrypt.compare(
          credentials!.password,
          userFound.password,
        );

        if (!passwordMatch) throw new Error("Invalid Password");
        
        console.log("🔐 [AUTH] User authorized:", {
          id: userFound.id,
          email: userFound.email,
          name: userFound.name,
          role: userFound.role,
        });
        
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
        console.log("🔑 [JWT] Creating token from user:", {
          id: u.id,
          email: u.email,
          role: u.role,
        });
        return {
          ...token,
          id: u.id,
          role: u.role,
        };
      }
      
      console.log("🔑 [JWT] Returning existing token:", {
        id: token.id,
        email: token.email,
        role: token.role,
      });
      
      return token;
    },
    async session({ session, token }) {
      // Gracefully handle invalid/corrupted tokens
      try {
        // If token is missing critical data, return null to force logout
        if (!token?.id || !token?.email) {
          console.log("❌ [SESSION] Invalid token detected, session will be cleared");
          return null as any;
        }
        
        console.log("✅ [SESSION] Creating session from token:", {
          tokenId: token.id,
          tokenEmail: token.email,
          tokenRole: token.role,
        });
        
      const finalSession = {
        ...session,
        user: {
          ...session.user,
          _id: token.id,
          name: token.name,
          role: token.role as string,
        },
      };
      
      console.log("✅ [SESSION] Final session object:", {
        userId: finalSession.user._id,
        userEmail: finalSession.user.email,
        userName: finalSession.user.name,
        userRole: finalSession.user.role,
      });
      
      return finalSession;
      } catch (error) {
        // Silently fail and clear session
        console.log("❌ [SESSION] Session validation error, clearing session");
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

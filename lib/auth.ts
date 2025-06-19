import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "./db";
import NextAuth, { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
// Konfigurasi NextAuth
export const authConfig: NextAuthConfig = {
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Validasi awal dengan type guards
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email =
          typeof credentials.email === "string" ? credentials.email.trim() : "";
        const password =
          typeof credentials.password === "string" ? credentials.password : "";

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          // Make sure to select the role field
          select: {
            id: true,
            name: true,
            email: true,
            password: true,
            role: true, // Important: Select the role field
          },
        });

        // Jika user tidak ditemukan atau password kosong/null
        if (!user || !user.password || typeof user.password !== "string") {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          role: user.role, // Include role in the returned user object
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // JWT callback - Store role in the token
    async jwt({ token, user }) {
      // When user signs in, add role to token
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    // Session callback - Add role to session
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role; // Add role to session
      }
      return session;
    },
  },
};

// Ekspor handler dan fungsi auth
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// Ambil user yang sedang login
export const getCurrentUser = async () => {
  const currentSession = await auth();

  if (!currentSession?.user?.email) {
    throw new Error("Not authenticated");
  }

  const user = await prisma.user.findUnique({
    where: { email: currentSession.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true, // Include role in the selection
      // Don't select password for security
    },
  });

  if (!user) throw new Error("User not found");

  return user;
};

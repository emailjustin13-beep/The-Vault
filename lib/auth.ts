import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import crypto from "crypto";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email } = parsed.data;

        // Lazy import db to avoid build-time initialization
        const { db } = await import("@/db");
        const { users, settings } = await import("@/db/schema");
        const { eq } = await import("drizzle-orm");

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user) {
          // Auto-create first user (single-user system)
          const existingUsers = await db.select().from(users).limit(1);
          if (existingUsers.length > 0) return null;

          const id = crypto.randomUUID();
          const [newUser] = await db
            .insert(users)
            .values({ id, email, name: email.split("@")[0] })
            .returning();

          await db.insert(settings).values({
            id: crypto.randomUUID(),
            userId: newUser.id,
          });

          return { id: newUser.id, email: newUser.email, name: newUser.name };
        }

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

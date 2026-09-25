import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) {
        return args.existingUserId;
      }
      const email = (args.profile as { email?: string })?.email;
      if (email) {
        const emailLower = email.toLowerCase().trim();
        const existing = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("email"), emailLower))
          .first();
        if (existing) {
          return existing._id;
        }
      }
      return await ctx.db.insert("users", {
        email: email ? email.toLowerCase().trim() : undefined,
        name: (args.profile as { name?: string })?.name,
        isActive: true,
      });
    },
  },
});


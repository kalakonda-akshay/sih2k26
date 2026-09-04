import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { userRole } from "./lib/validators";

/**
 * Returns the signed-in user.
 *
 * No auth provider is wired up in this phase. The lookup path for a real
 * provider is already here — when Convex Auth / Clerk is added, identities
 * resolve through `tokenIdentifier` and nothing else has to change.
 *
 * Until then this falls back to the seeded administrator so the shell has a
 * user context to render. That fallback reads a real row from the database;
 * it is not a hardcoded object.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_tokenIdentifier", (q) =>
          q.eq("tokenIdentifier", identity.tokenIdentifier),
        )
        .unique();
      if (user) return user;
    }

    // Phase-2 development fallback: the seeded admin.
    return await ctx.db
      .query("users")
      .withIndex("by_role_and_isActive", (q) =>
        q.eq("role", "admin").eq("isActive", true),
      )
      .first();
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => await ctx.db.get(userId),
});

export const listUsers = query({
  args: {
    role: v.optional(userRole),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { role, isActive }) => {
    const users = role
      ? await ctx.db
          .query("users")
          .withIndex("by_role", (q) => q.eq("role", role))
          .collect()
      : await ctx.db.query("users").collect();

    return isActive === undefined
      ? users
      : users.filter((u) => u.isActive === isActive);
  },
});

export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: userRole,
    organization: v.optional(v.string()),
    phone: v.optional(v.string()),
    profileImage: v.optional(v.string()),
    district: v.optional(v.string()),
    state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Email is the natural key — never create a second row for the same one.
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    if (existing) return existing._id;

    const now = Date.now();
    return await ctx.db.insert("users", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    organization: v.optional(v.string()),
    phone: v.optional(v.string()),
    profileImage: v.optional(v.string()),
    district: v.optional(v.string()),
    state: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, ...patch }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error(`User ${userId} not found`);

    // Drop undefined keys so a partial update never clears existing values.
    const defined = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    );

    await ctx.db.patch(userId, { ...defined, updatedAt: Date.now() });
    return userId;
  },
});

export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: userRole,
  },
  handler: async (ctx, { userId, role }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error(`User ${userId} not found`);

    await ctx.db.patch(userId, { role, updatedAt: Date.now() });
    return userId;
  },
});

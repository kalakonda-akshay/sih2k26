import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { userRole } from "./lib/validators";
import { getAuthUserId } from "@convex-dev/auth/server";


/**
 * Returns the signed-in user.
 *
 * Primary lookup: getAuthUserId from @convex-dev/auth reads the JWT and
 * returns the user's Convex document ID directly. This is the authoritative
 * path when the user has signed in via email+password.
 *
 * Fallback: returns the seeded demo administrator so the dashboard renders
 * during development / demo before any real sign-in has happened.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    // Primary: convex-dev/auth session
    const userId = await getAuthUserId(ctx);
    if (userId) {
      return await ctx.db.get(userId);
    }

    // Secondary: legacy tokenIdentifier path (kept for future Clerk/Auth0 wiring)
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

    // Development fallback: the seeded admin.
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
      .withIndex("email", (q) => q.eq("email", args.email))
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

/**
 * Save extra profile fields for the currently signed-in user.
 *
 * Called on the client after a successful signup so that name, role,
 * organization, etc. are stored on the user document that convex-dev/auth
 * creates. Only writes to the caller's own record — no userId arg needed.
 */
export const saveUserProfile = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    organization: v.optional(v.string()),
    district: v.optional(v.string()),
    state: v.optional(v.string()),
    preferredLanguage: v.optional(v.string()),
    role: v.optional(userRole),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    // Drop undefined values so we never overwrite existing fields with undefined.
    const defined = Object.fromEntries(
      Object.entries(args).filter(([, val]) => val !== undefined),
    );

    await ctx.db.patch(userId, {
      ...defined,
      updatedAt: now,
      // Only set createdAt on first write (i.e. if not already set).
    });
    return userId;
  },
});

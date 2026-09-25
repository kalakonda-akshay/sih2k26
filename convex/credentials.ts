import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { userRole } from "./lib/validators";
import type { UserRole } from "./lib/validators";
import { Scrypt } from "lucia";

/**
 * NER-Vision AI — Master System Login Credentials Catalog.
 *
 * Stored directly in the Convex database so administrators, operators,
 * field teams, evaluators, and judges can inspect all verified accounts
 * across all 4 RBAC role tiers.
 */
export const SYSTEM_CREDENTIALS: Array<{
  email: string;
  password: string;
  name: string;
  role: UserRole;
  organization: string;
  phone: string;
  state: string;
  district: string;
  description: string;
  isDefaultAdmin: boolean;
}> = [
  {
    email: "akshaykalakonda9@gmail.com",
    password: "Ram@6002",
    name: "Kalakonda Akshay",
    role: "admin",
    organization: "MDoNER — Regional Command",
    phone: "+91 98640 11201",
    state: "Assam",
    district: "Kamrup Metropolitan",
    description: "Lead System Administrator & MDoNER Regional Commander",
    isDefaultAdmin: true,
  },
  {
    email: "admin@nervision.gov.in",
    password: "Admin@123",
    name: "Kalakonda Akshay",
    role: "admin",
    organization: "MDoNER — Regional Command",
    phone: "+91 98640 11201",
    state: "Assam",
    district: "Kamrup Metropolitan",
    description: "Regional Command & Tactical Operations Center Administrator",
    isDefaultAdmin: true,
  },
  {
    email: "operator@nervision.gov.in",
    password: "Operator@123",
    name: "Dharshana S",
    role: "logistics_operator",
    organization: "NE Logistics Corporation",
    phone: "+91 98640 11202",
    state: "Assam",
    district: "Kamrup Metropolitan",
    description: "Chief Logistics Dispatcher & Tactical Convoy Route Planner",
    isDefaultAdmin: false,
  },
  {
    email: "field.eastkameng@nervision.gov.in",
    password: "Field@123",
    name: "Chinmayi",
    role: "field_officer",
    organization: "Arunachal PWD — East Kameng",
    phone: "+91 98640 11203",
    state: "Arunachal Pradesh",
    district: "East Kameng",
    description: "Trans-Arunachal Highway Ground Patrol & Landslide Reporter",
    isDefaultAdmin: false,
  },
  {
    email: "field.ribhoi@nervision.gov.in",
    password: "Field@123",
    name: "Deepshika",
    role: "field_officer",
    organization: "Meghalaya PWD — Ri-Bhoi",
    phone: "+91 98640 11204",
    state: "Meghalaya",
    district: "Ri-Bhoi",
    description: "Shillong Plateau Rapid Emergency Response & Drone Field Officer",
    isDefaultAdmin: false,
  },
  {
    email: "emergency@nervision.gov.in",
    password: "Emergency@123",
    name: "Mohulram",
    role: "emergency_authority",
    organization: "State Disaster Management Authority",
    phone: "+91 98640 11205",
    state: "Sikkim",
    district: "Gangtok",
    description: "SDMA Disaster Authority & Fast2SMS Emergency Broadcast Controller",
    isDefaultAdmin: false,
  },
  {
    email: "operator.mizoram@nervision.gov.in",
    password: "Operator@123",
    name: "Jwala Shri",
    role: "logistics_operator",
    organization: "Mizoram State Transport",
    phone: "+91 98640 11206",
    state: "Mizoram",
    district: "Aizawl",
    description: "Southern NER Hill Corridors Operations & Transport Manager",
    isDefaultAdmin: false,
  },
];

/**
 * Returns all system login credentials.
 * Reads from the `loginCredentials` table in Convex. If empty, falls back to
 * `SYSTEM_CREDENTIALS` so callers always receive valid credentials.
 */
export const listCredentials = query({
  args: {},
  handler: async (ctx) => {
    const creds = await ctx.db.query("loginCredentials").collect();
    if (creds.length > 0) {
      return creds.sort((a, b) => {
        if (a.isDefaultAdmin && !b.isDefaultAdmin) return -1;
        if (!a.isDefaultAdmin && b.isDefaultAdmin) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    return SYSTEM_CREDENTIALS.map((c, idx) => ({
      _id: `fallback_${idx}`,
      _creationTime: Date.now(),
      ...c,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
  },
});

/**
 * Master Synchronization Mutation:
 * 1. Populates/updates `loginCredentials` in the Convex database.
 * 2. Synchronizes corresponding rows in `users` with their full profiles & roles.
 * 3. Hashes passwords with Lucia Scrypt and populates `authAccounts` for Convex Auth.
 * 4. Cleans up any duplicate unlinked user rows.
 */
export const seedLoginCredentials = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const scrypt = new Scrypt();
    const results: Array<{ email: string; role: string; status: string }> = [];

    for (const cred of SYSTEM_CREDENTIALS) {
      const emailLower = cred.email.toLowerCase().trim();

      // ── 1. Upsert into loginCredentials table ──────────────────────────────
      const existingCred = await ctx.db
        .query("loginCredentials")
        .withIndex("by_email", (q) => q.eq("email", emailLower))
        .first();

      if (existingCred) {
        await ctx.db.patch(existingCred._id, {
          password: cred.password,
          name: cred.name,
          role: cred.role,
          organization: cred.organization,
          phone: cred.phone,
          district: cred.district,
          state: cred.state,
          description: cred.description,
          isDefaultAdmin: cred.isDefaultAdmin,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("loginCredentials", {
          email: emailLower,
          password: cred.password,
          name: cred.name,
          role: cred.role,
          organization: cred.organization,
          phone: cred.phone,
          district: cred.district,
          state: cred.state,
          description: cred.description,
          isDefaultAdmin: cred.isDefaultAdmin,
          createdAt: now,
          updatedAt: now,
        });
      }

      // ── 2. Find or create canonical user row in `users` ─────────────────────
      // Find all users matching this email
      const matchingUsers = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", emailLower))
        .collect();

      let canonicalUser = matchingUsers.find((u) => u.role !== undefined);
      if (!canonicalUser && matchingUsers.length > 0) {
        canonicalUser = matchingUsers[0];
      }

      let userId = canonicalUser?._id;

      if (!canonicalUser) {
        userId = await ctx.db.insert("users", {
          email: emailLower,
          name: cred.name,
          role: cred.role,
          organization: cred.organization,
          phone: cred.phone,
          district: cred.district,
          state: cred.state,
          isActive: true,
          emailVerificationTime: now,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        await ctx.db.patch(canonicalUser._id, {
          name: cred.name,
          role: cred.role,
          organization: cred.organization,
          phone: cred.phone,
          district: cred.district,
          state: cred.state,
          isActive: true,
          emailVerificationTime: canonicalUser.emailVerificationTime ?? now,
          updatedAt: now,
        });
        userId = canonicalUser._id;

        // Clean up duplicate unlinked empty user records
        for (const duplicate of matchingUsers) {
          if (duplicate._id !== canonicalUser._id && !duplicate.role) {
            await ctx.db.delete(duplicate._id);
          }
        }
      }

      // ── 3. Upsert password in `authAccounts` ───────────────────────────────
      const passwordHash = await scrypt.hash(cred.password);

      const existingAccount = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "password").eq("providerAccountId", emailLower),
        )
        .first();

      if (existingAccount) {
        await ctx.db.patch(existingAccount._id, {
          userId: userId!,
          secret: passwordHash,
          emailVerified: emailLower,
        });
      } else {
        await ctx.db.insert("authAccounts", {
          userId: userId!,
          provider: "password",
          providerAccountId: emailLower,
          secret: passwordHash,
          emailVerified: emailLower,
        });
      }

      results.push({ email: emailLower, role: cred.role, status: "synchronized" });
    }

    return {
      success: true,
      synchronizedAccounts: results.length,
      timestamp: now,
      accounts: results,
    };
  },
});

import type { DefaultSession, NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import type { PrismaClient } from "@prisma/client";

type SessionRole = "SUPER_ADMIN" | "CONTENT_MANAGER" | "ADMIN" | "USER";

let _dbModulePromise: Promise<{ db: PrismaClient }> | null = null;
async function getDbClient(): Promise<PrismaClient> {
  _dbModulePromise ??= import("./db") as Promise<{ db: PrismaClient }>;
  const mod = await _dbModulePromise;
  return mod.db;
}

function normalizeAuthUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function resolveAuthUrl(): string {
  const isVercelRuntime = Boolean(
    process.env.VERCEL || process.env.VERCEL_URL || process.env.VERCEL_ENV,
  );
  const fromEnvDev =
    normalizeAuthUrl(process.env.AUTH_URL) ??
    normalizeAuthUrl(process.env.NEXTAUTH_URL);
  if (!isVercelRuntime) {
    return fromEnvDev ?? "http://localhost:3000";
  }

  const fromEnv =
    fromEnvDev;
  if (fromEnv) return fromEnv;

  const fromVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  const normalizedVercel = fromVercel ? normalizeAuthUrl(`https://${fromVercel}`) : null;
  if (normalizedVercel) return normalizedVercel;

  return "https://zendo.vn";
}

function resolveAuthSecret(): string {
  const fromEnv = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required in production.");
  }

  return "zendo-dev-auth-secret";
}

const resolvedAuthUrl = resolveAuthUrl();
const resolvedAuthSecret = resolveAuthSecret();
process.env.AUTH_URL = resolvedAuthUrl;
process.env.NEXTAUTH_URL = resolvedAuthUrl;
process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? resolvedAuthSecret;
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? resolvedAuthSecret;

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: SessionRole;
      /** CTV storefront: có AffiliateProfile ACTIVE (chỉ ý nghĩa với role USER). */
      affiliateActive?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: SessionRole;
    affiliateActive?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: SessionRole;
    uid?: string;
    /** Đồng bộ với Session.user.affiliateActive cho role USER. */
    affiliateActive?: boolean;
  }
}

const credentialsProvider = Credentials({
  id: "admin-credentials",
  name: "Admin Credentials",
  credentials: {
    identifier: { label: "Email hoặc số điện thoại", type: "text" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    const allowedAdminRoles = new Set(["SUPER_ADMIN", "CONTENT_MANAGER", "ADMIN"]);
    const identifierRaw = String(credentials?.identifier ?? "").trim();
    const password = String(credentials?.password ?? "");
    const identifier = identifierRaw.toLowerCase();
    const normalizedPhone = identifierRaw.replace(/[^\d+]/g, "");
    const phoneCandidates = Array.from(
      new Set(
        [
          normalizedPhone,
          normalizedPhone.startsWith("+84") ? `0${normalizedPhone.slice(3)}` : null,
          normalizedPhone.startsWith("84") ? `0${normalizedPhone.slice(2)}` : null,
        ].filter((value): value is string => Boolean(value)),
      ),
    );

    if (!identifierRaw || !password) return null;

    let db: PrismaClient;
    try {
      const dbModule = await import("./db");
      db = dbModule.db;
    } catch {
      return null;
    }

    let account:
      | (Awaited<ReturnType<PrismaClient["admin"]["findFirst"]>> & {
          role?: { name?: string | null } | null;
        })
      | null = null;
    try {
      const adminByPhone =
        phoneCandidates.length > 0
          ? await db.admin.findFirst({
              where: {
                username: {
                  in: phoneCandidates,
                },
              },
              include: { role: true },
            })
          : null;

      const adminByIdentifier = await db.admin.findFirst({
        where: {
          OR: [{ username: identifierRaw }, { username: identifier }, { email: identifier }],
          role: { name: { in: Array.from(allowedAdminRoles) } },
        },
        include: { role: true },
      });
      account = adminByPhone ?? adminByIdentifier;
    } catch {
      return null;
    }

    if (!account) {
      return null;
    }
    if (account.status !== "ACTIVE") {
      return null;
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await compare(password, account.passwordHash);
    } catch {
      return null;
    }
    if (!isPasswordValid) {
      return null;
    }
    if (!allowedAdminRoles.has(String(account.role?.name ?? ""))) {
      return null;
    }

    return {
      id: account.id,
      email: account.email,
      name: account.fullName,
      role: (String(account.role?.name ?? "ADMIN") as SessionRole) || "ADMIN",
    };
  },
});

const customerCredentialsProvider = Credentials({
  id: "customer-credentials",
  name: "Customer Credentials",
  credentials: {
    identifier: { label: "Email hoặc số điện thoại", type: "text" },
    password: { label: "Mật khẩu", type: "password" },
  },
  async authorize(credentials) {
    const identifierRaw = String(credentials?.identifier ?? "").trim();
    const password = String(credentials?.password ?? "");
    if (!identifierRaw || !password) {
      return null;
    }
    const identifier = identifierRaw.toLowerCase();
    const normalizedPhone = identifierRaw.replace(/[^\d+]/g, "");
    const phoneCandidates = Array.from(
      new Set(
        [
          normalizedPhone,
          normalizedPhone.startsWith("+84") ? `0${normalizedPhone.slice(3)}` : null,
          normalizedPhone.startsWith("84") ? `0${normalizedPhone.slice(2)}` : null,
        ].filter((value): value is string => Boolean(value)),
      ),
    );

    const tImport0 = Date.now();
    let db: PrismaClient;
    try {
      db = await getDbClient();
    } catch {
      return null;
    }
    const msImport = Date.now() - tImport0;
    const tQuery0 = Date.now();
    let customer: { id: string; email: string | null; fullName: string | null; phone: string | null; passwordHash: string | null } | null = null;
    try {
      customer = await db.customer.findFirst({
        where: {
          OR: [{ email: identifier }, { phone: { in: phoneCandidates } }],
        },
        select: { id: true, email: true, fullName: true, phone: true, passwordHash: true },
      });
    } catch {
      return null;
    }

    if (!customer) {
      return null;
    }
    if (!customer.passwordHash) {
      return null;
    }

    const tCompare0 = Date.now();
    let validPassword = false;
    try {
      validPassword = await compare(password, customer.passwordHash);
    } catch {
      return null;
    }
    if (!validPassword) {
      return null;
    }

    void msImport;

    void tQuery0;
    void tCompare0;
    return {
      id: customer.id,
      email: customer.email ?? undefined,
      name: customer.fullName ?? customer.phone ?? "Khách hàng Zendo.vn",
      role: "USER",
      affiliateActive: false,
    };
  },
});

const providers: NextAuthOptions["providers"] = [credentialsProvider, customerCredentialsProvider];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  secret: resolvedAuthSecret,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/tai-khoan",
  },
  providers,
  events: {
    async signIn(message) {
      const user = message.user as { id?: string; role?: SessionRole } | undefined;
      const account = message.account;
      if (!user?.id || user.role !== "USER") return;
      if (!account || account.provider === "admin-credentials") return;
      try {
        const { publishCustomerNewSignIn } = await import("./system-account-notifications");
        const hint =
          account.provider === "google"
            ? "Google"
            : account.provider === "customer-credentials"
              ? "Email / SĐT + mật khẩu"
              : account.provider;
        publishCustomerNewSignIn({ customerId: user.id, deviceHint: hint });
      } catch {
        /* noop */
      }
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account) return true;
      if (account.provider === "admin-credentials" || account.provider === "customer-credentials") return true;
      if (account.provider !== "google") return false;

      const email = user.email?.trim().toLowerCase() ?? "";
      if (!email) return false;

      try {
        const dbModule = await import("./db");
        const db = dbModule.db;

        const adminAccount = await db.admin.findFirst({
          where: {
            email,
            status: "ACTIVE",
            role: {
              name: {
                in: ["SUPER_ADMIN", "CONTENT_MANAGER", "ADMIN"],
              },
            },
          },
          select: { id: true, fullName: true, email: true, role: { select: { name: true } } },
        });
        if (adminAccount) {
          user.id = adminAccount.id;
          user.email = adminAccount.email;
          user.name = adminAccount.fullName ?? user.name;
          user.role = (adminAccount.role?.name as SessionRole | undefined) ?? "ADMIN";
          return true;
        }

        const customer = await db.customer.upsert({
          where: { email },
          update: {
            fullName: user.name ?? undefined,
            isGuest: false,
          },
          create: {
            email,
            fullName: user.name ?? null,
            isGuest: false,
          },
          select: { id: true },
        });

        const aff = await db.affiliateProfile.findFirst({
          where: { customerId: customer.id, status: "ACTIVE" },
          select: { id: true },
        });

        user.id = customer.id;
        user.role = "USER";
        user.affiliateActive = Boolean(aff);
        return true;
      } catch {
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.uid = user.id;
        if (user.role === "USER") {
          token.affiliateActive = Boolean(user.affiliateActive);
        } else {
          token.affiliateActive = false;
        }
      }
      const uid = typeof token.uid === "string" ? token.uid : undefined;
      const role = token.role as SessionRole | undefined;
      if (uid && role === "USER") {
        try {
          const dbModule = await import("./db");
          const aff = await dbModule.db.affiliateProfile.findFirst({
            where: { customerId: uid, status: "ACTIVE" },
            select: { id: true },
          });
          token.affiliateActive = Boolean(aff);
        } catch {
          /* Giữ token.affiliateActive hiện có nếu DB tạm không đọc được. */
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string | undefined) ?? token.sub ?? "";
        session.user.role = (token.role as SessionRole | undefined) ?? "USER";
        session.user.affiliateActive =
          session.user.role === "USER" ? Boolean(token.affiliateActive) : false;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      const raw = (url ?? "").trim();
      if (!raw) return baseUrl;
      if (raw.startsWith("/")) return `${baseUrl}${raw}`;
      if (raw.startsWith(baseUrl)) return raw;
      return baseUrl;
    },
  },
};

import type { Role } from "@prisma/client";

const ADMIN_EMAIL_SUFFIX = "@nebula-corp.com";

export function getRoleForEmail(email: string): Role {
  return email.endsWith(ADMIN_EMAIL_SUFFIX) ? "ADMIN" : "STANDARD";
}

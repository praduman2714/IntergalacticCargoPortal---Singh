import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { signAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsedBody = loginSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json({ error: "Login requires a valid email and password." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: {
      email: parsedBody.data.email.trim().toLowerCase()
    }
  });

  if (!user || !(await bcrypt.compare(parsedBody.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const token = signAuthToken({
    userId: user.id,
    email: user.email,
    role: user.role
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    },
    token
  });
}

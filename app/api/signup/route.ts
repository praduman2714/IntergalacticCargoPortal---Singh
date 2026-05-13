import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { signAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRoleForEmail } from "@/lib/roles";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsedBody = signupSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Signup requires a valid email and a password with at least 8 characters." },
      { status: 400 }
    );
  }

  const email = parsedBody.data.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(parsedBody.data.password, 12);
  const role = getRoleForEmail(email);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return NextResponse.json({ user, token }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "User already exists or could not be created." }, { status: 409 });
  }
}

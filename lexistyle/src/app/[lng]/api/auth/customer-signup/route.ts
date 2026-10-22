import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * 고객 회원가입 API
 * Google OAuth 콜백에서 호출되어 사용자 정보를 DB에 저장합니다.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, image, role = "customer" } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // 기존 사용자 확인
    const existingUser = await db().query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      // 기존 사용자 정보 업데이트
      await db()
        .update(users)
        .set({
          name: name || existingUser.name,
          image: image || existingUser.image,
          updatedAt: new Date(),
        })
        .where(eq(users.email, email));

      return NextResponse.json({
        success: true,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: name || existingUser.name,
          role: existingUser.role,
        },
        isNew: false,
      });
    }

    // 신규 사용자 생성
    const [newUser] = await db()
      .insert(users)
      .values({
        email,
        name,
        image,
        role,
        status: "active",
      })
      .returning();

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
      isNew: true,
    });
  } catch (error) {
    console.error("Customer signup error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

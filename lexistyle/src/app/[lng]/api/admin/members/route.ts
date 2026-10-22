import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { verifySessionToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * 회원 목록 조회 API (관리자 전용)
 */
export async function GET(req: Request) {
  try {
    // 세션 확인
    const token = req.headers.get("cookie")?.match(/lexi_session=([^;]+)/)?.[1];
    const session = await verifySessionToken(token);
    
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // URL 파라미터 파싱
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const offset = (page - 1) * limit;

    // 기본 쿼리 조건
    let whereClause = sql`1=1`;
    
    if (role) {
      whereClause = sql`${whereClause} AND ${users.role} = ${role}`;
    }
    
    if (status) {
      whereClause = sql`${whereClause} AND ${users.status} = ${status}`;
    }
    
    if (search) {
      whereClause = sql`${whereClause} AND (${users.email} ILIKE ${`%${search}%`} OR ${users.name} ILIKE ${`%${search}%`})`;
    }

    // 회원 목록 조회
    const members = await db()
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    // 전체 개수 조회
    const countResult = await db()
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause);

    const total = countResult[0]?.count || 0;

    return NextResponse.json({
      members,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Members list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}

/**
 * 회원 정보 수정 API (관리자 전용)
 */
export async function PUT(req: Request) {
  try {
    // 세션 확인
    const token = req.headers.get("cookie")?.match(/lexi_session=([^;]+)/)?.[1];
    const session = await verifySessionToken(token);
    
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, role, status, tier, points } = body;

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // 업데이트할 필드만 추출
    const updateData: any = { updatedAt: new Date() };
    
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (tier !== undefined) updateData.tier = tier;
    if (points !== undefined) updateData.points = points;

    const [updatedUser] = await db()
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Member update error:", error);
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 }
    );
  }
}

/**
 * 회원 삭제 API (관리자 전용 - soft delete)
 */
export async function DELETE(req: Request) {
  try {
    // 세션 확인
    const token = req.headers.get("cookie")?.match(/lexi_session=([^;]+)/)?.[1];
    const session = await verifySessionToken(token);
    
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Soft delete (deletedAt 설정)
    await db()
      .update(users)
      .set({
        deletedAt: new Date(),
        status: "deleted",
        updatedAt: new Date(),
      })
      .where(eq(users.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Member delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete member" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import prisma from "@/libs/prisma";

// GET /api/admin/users - Get all users
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    
    // Check if user is staff
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    if (!user || user.role !== "staff") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    
    const users = await prisma.user.findMany({
      where: search ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ]
      } : undefined,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    
    return NextResponse.json({ users });
    
  } catch (error) {
    console.error("Admin users fetch error:", error);
    return NextResponse.json({ message: "Failed to fetch users" }, { status: 500 });
  }
}

// PATCH /api/admin/users - Update user role
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    
    // Check if user is staff
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    if (!currentUser || currentUser.role !== "staff") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    
    const body = await request.json();
    const { userId, role } = body;
    
    if (!userId || !role) {
      return NextResponse.json({ message: "User ID and role required" }, { status: 400 });
    }
    
    if (role !== "user" && role !== "staff") {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 });
    }
    
    // Prevent user from changing their own role
    if (userId === currentUser.id) {
      return NextResponse.json({ message: "Cannot change your own role" }, { status: 400 });
    }
    
    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      }
    });
    
    console.log(`👤 User ${updatedUser.email} role updated to ${role} by ${session.user.email}`);
    
    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
    
  } catch (error) {
    console.error("Admin user update error:", error);
    return NextResponse.json({ message: "Failed to update user" }, { status: 500 });
  }
}


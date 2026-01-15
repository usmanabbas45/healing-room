import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { redirect } from "next/navigation";
import prisma from "@/libs/prisma";
import UserManagement from "./UserManagement";

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return {
    title: `User Management | Admin`,
  };
}

async function getUsers() {
  try {
    const users = await prisma.user.findMany({
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
    
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

export default async function UsersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  // Check if user is staff
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user || user.role !== "staff") {
    redirect("/");
  }

  const users = await getUsers();

  return (
    <div className="py-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">User Management</h1>
        <p className="text-sm text-text-muted mt-1">
          Manage user accounts and roles
        </p>
      </div>

      <Suspense fallback={<div className="text-center py-8">Loading users...</div>}>
        <UserManagement initialUsers={users} currentUserId={user.id} />
      </Suspense>
    </div>
  );
}


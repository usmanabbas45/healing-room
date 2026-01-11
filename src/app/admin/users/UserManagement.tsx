"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { ConfirmationDialog } from "@/components/admin/ConfirmationDialog";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
  _count: {
    orders: number;
  };
}

interface UserManagementProps {
  initialUsers: User[];
  currentUserId: string;
}

export default function UserManagement({ initialUsers, currentUserId }: UserManagementProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<"user" | "staff">("user");

  const filteredUsers = users.filter((user) => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRoleChange = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          role: newRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update user role");
      }

      toast.success(`${selectedUser.name}'s role updated to ${newRole}`);
      
      // Update local state
      setUsers(users.map(u => 
        u.id === selectedUser.id ? { ...u, role: newRole } : u
      ));
      
      setShowRoleDialog(false);
      setSelectedUser(null);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update user role");
    }
  };

  const openRoleDialog = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role === "staff" ? "user" : "staff");
    setShowRoleDialog(true);
  };

  return (
    <>
      <div className="bg-white border border-border-primary rounded-xl overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-border-primary">
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Stats */}
        <div className="px-4 py-3 bg-bg-alt/50 border-b border-border-primary">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-text-muted">Total Users:</span>
              <span className="ml-2 font-semibold text-text-primary">{users.length}</span>
            </div>
            <div>
              <span className="text-text-muted">Staff:</span>
              <span className="ml-2 font-semibold text-text-primary">
                {users.filter(u => u.role === "staff").length}
              </span>
            </div>
            <div>
              <span className="text-text-muted">Showing:</span>
              <span className="ml-2 font-semibold text-text-primary">{filteredUsers.length}</span>
            </div>
          </div>
        </div>

        {/* Users Table */}
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            No users found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg-alt/50 border-b border-border-primary">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Orders</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Joined</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary">
                {filteredUsers.map((user) => {
                  const isCurrentUser = user.id === currentUserId;
                  
                  return (
                    <tr key={user.id} className="hover:bg-bg-alt/30">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium text-text-primary flex items-center gap-2">
                            {user.name}
                            {isCurrentUser && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">You</span>
                            )}
                          </div>
                          <div className="text-sm text-text-muted">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === "staff" 
                            ? "bg-purple-100 text-purple-800" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {user.role === "staff" ? (
                            <>
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                              </svg>
                              Staff
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                              User
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-text-primary">
                        {user._count.orders}
                      </td>
                      <td className="px-4 py-4 text-sm text-text-muted">
                        {format(new Date(user.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {!isCurrentUser && (
                          <button
                            onClick={() => openRoleDialog(user)}
                            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            Change Role
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Change Dialog */}
      {selectedUser && (
        <ConfirmationDialog
          isOpen={showRoleDialog}
          onClose={() => {
            setShowRoleDialog(false);
            setSelectedUser(null);
          }}
          onConfirm={handleRoleChange}
          title={`Change User Role`}
          description={`Are you sure you want to change ${selectedUser.name}'s role from "${selectedUser.role}" to "${newRole}"? ${newRole === "staff" ? "This will give them access to the admin panel." : "This will remove their admin access."}`}
          confirmText="yes"
          confirmLabel="Change Role"
          variant={newRole === "staff" ? "success" : "default"}
        />
      )}
    </>
  );
}


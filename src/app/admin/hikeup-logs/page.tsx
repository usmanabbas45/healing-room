import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { redirect } from "next/navigation";
import prisma from "@/libs/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HikeupLogsPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "staff") {
    redirect("/login");
  }

  // Fetch logs from database (most recent first)
  const logs = await prisma.hikeupLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100, // Show last 100 logs
  });

  // Get event type counts for summary
  const eventCounts = await prisma.hikeupLog.groupBy({
    by: ["eventType"],
    _count: true,
  });

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "token_created":
        return "✅";
      case "token_refreshed":
        return "🔄";
      case "token_deleted":
        return "🗑️";
      case "refresh_failed":
        return "⚠️";
      case "api_error":
        return "❌";
      default:
        return "📝";
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "token_created":
        return "bg-green-50 border-green-200 text-green-800";
      case "token_refreshed":
        return "bg-blue-50 border-blue-200 text-blue-800";
      case "token_deleted":
        return "bg-red-50 border-red-200 text-red-800";
      case "refresh_failed":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "api_error":
        return "bg-orange-50 border-orange-200 text-orange-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Hikeup Integration Logs</h1>
            <p className="text-text-muted mt-1">
              Track token events, API errors, and integration health
            </p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 bg-bg-alt border border-border-primary rounded-lg text-text-primary hover:bg-bg-secondary transition-colors"
          >
            ← Back to Admin
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {eventCounts.map((count) => (
            <div
              key={count.eventType}
              className={`p-4 rounded-lg border ${getEventColor(count.eventType)}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getEventIcon(count.eventType)}</span>
                <div>
                  <p className="text-sm font-medium capitalize">
                    {count.eventType.replace(/_/g, " ")}
                  </p>
                  <p className="text-2xl font-bold">{count._count}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow-sm border border-border-primary overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-primary">
              <thead className="bg-bg-alt">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-border-primary">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-text-muted">
                      No logs yet. Hikeup events will appear here.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-bg-alt transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-text-muted">
                        {new Date(log.createdAt).toLocaleString("en-CA", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getEventColor(
                            log.eventType
                          )}`}
                        >
                          {getEventIcon(log.eventType)} {log.eventType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary">{log.message}</td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        <details className="cursor-pointer">
                          <summary className="text-primary hover:underline">View Details</summary>
                          <div className="mt-2 p-3 bg-bg-alt rounded text-xs space-y-1">
                            {log.endpoint && (
                              <div>
                                <strong>Endpoint:</strong>{" "}
                                <code className="bg-white px-1 py-0.5 rounded">
                                  {log.endpoint}
                                </code>
                              </div>
                            )}
                            {log.statusCode && (
                              <div>
                                <strong>Status Code:</strong> {log.statusCode}
                              </div>
                            )}
                            {log.tokenAge !== null && log.tokenAge !== undefined && (
                              <div>
                                <strong>Token Age:</strong> {log.tokenAge} days
                              </div>
                            )}
                            {log.tokenExpired !== null && log.tokenExpired !== undefined && (
                              <div>
                                <strong>Token Expired:</strong> {log.tokenExpired ? "Yes" : "No"}
                              </div>
                            )}
                            {log.hadRefreshToken !== null && log.hadRefreshToken !== undefined && (
                              <div>
                                <strong>Had Refresh Token:</strong>{" "}
                                {log.hadRefreshToken ? "Yes" : "No"}
                              </div>
                            )}
                            {log.errorResponse && (
                              <div>
                                <strong>Error Response:</strong>
                                <pre className="bg-white p-2 rounded mt-1 overflow-x-auto text-xs">
                                  {log.errorResponse}
                                </pre>
                              </div>
                            )}
                            {log.metadata && (
                              <div>
                                <strong>Metadata:</strong>
                                <pre className="bg-white p-2 rounded mt-1 overflow-x-auto text-xs">
                                  {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer note */}
        {logs.length >= 100 && (
          <p className="text-sm text-text-muted text-center mt-4">
            Showing the most recent 100 logs
          </p>
        )}
      </div>
    </div>
  );
}



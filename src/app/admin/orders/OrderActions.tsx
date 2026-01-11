"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/admin/ConfirmationDialog";
import { TrackingNumberDialog } from "@/components/admin/TrackingNumberDialog";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentMethod: string;
}

const statusFlow: Record<string, string[]> = {
  awaiting_payment: ["paid", "cancelled"],
  paid: ["processing", "cancelled", "refunded"],
  processing: ["ready_for_pickup", "out_for_delivery", "shipped", "cancelled"],
  ready_for_pickup: ["completed", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: ["completed"],
  completed: [],
  cancelled: [],
  refunded: [],
};

const statusLabels: Record<string, string> = {
  awaiting_payment: "Awaiting Payment",
  paid: "Mark as Paid",
  processing: "Start Processing",
  ready_for_pickup: "Ready for Pickup",
  out_for_delivery: "Out for Delivery",
  shipped: "Mark as Shipped",
  delivered: "Mark as Delivered",
  completed: "Complete Order",
  cancelled: "Cancel Order",
  refunded: "Refund Order",
};

export function OrderActions({ order }: { order: Order }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: string;
    title: string;
    description: string;
    variant: "danger" | "success" | "default";
  } | null>(null);

  const availableActions = statusFlow[order.status] || [];

  const updateOrder = async (newStatus: string, additionalData?: Record<string, any>) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          status: newStatus,
          ...additionalData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update order");
      }

      toast.success(`Order ${order.orderNumber} updated to ${statusLabels[newStatus] || newStatus}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update order");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    // If marking as shipped, show tracking number dialog
    if (newStatus === "shipped") {
      setShowTrackingDialog(true);
    }
    // If marking as paid, show confirmation dialog
    else if (newStatus === "paid" && order.paymentStatus !== "confirmed") {
      setConfirmAction({
        type: "paid",
        title: "Mark Order as Paid",
        description: `Confirm payment received for order #${order.orderNumber}. Make sure customer included order number in e-Transfer message.`,
        variant: "success",
      });
      setShowConfirmDialog(true);
    } else if (newStatus === "cancelled") {
      setConfirmAction({
        type: "cancelled",
        title: "Cancel Order",
        description: `Are you sure you want to cancel order #${order.orderNumber}? This action cannot be undone.`,
        variant: "danger",
      });
      setShowConfirmDialog(true);
    } else if (newStatus === "refunded") {
      setConfirmAction({
        type: "refunded",
        title: "Refund Order",
        description: `Are you sure you want to refund order #${order.orderNumber}? Make sure you've issued the refund before confirming.`,
        variant: "danger",
      });
      setShowConfirmDialog(true);
    } else {
      await updateOrder(newStatus);
    }
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;

    if (confirmAction.type === "paid") {
      await updateOrder("paid", { 
        paymentStatus: "confirmed", 
        paymentReference: `Confirmed on ${new Date().toLocaleDateString()}`,
        paidAt: new Date().toISOString(),
      });
    } else {
      await updateOrder(confirmAction.type);
    }
    
    setConfirmAction(null);
  };

  const handleTrackingSubmit = async (trackingNumber: string) => {
    await updateOrder("shipped", {
      trackingNumber: trackingNumber,
      shippedAt: new Date().toISOString(),
    });
  };

  const addStaffNote = async () => {
    if (!note.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          staffNotes: note,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add note");
      }

      toast.success("Note added");
      setNote("");
      setShowNoteInput(false);
      router.refresh();
    } catch (error) {
      toast.error("Failed to add note");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border-primary">
        {/* Status Actions */}
        {availableActions.map((status) => (
          <button
            key={status}
            onClick={() => handleStatusChange(status)}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              status === "cancelled" || status === "refunded"
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : status === "paid"
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-primary/10 text-primary hover:bg-primary/20"
            }`}
          >
            {statusLabels[status]}
          </button>
        ))}

        {/* Add Note */}
        {!showNoteInput ? (
          <button
            onClick={() => setShowNoteInput(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            + Add Note
          </button>
        ) : (
          <div className="flex gap-2 flex-1 min-w-[200px]">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add staff note..."
              className="flex-1 px-3 py-2 border border-border-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={isLoading}
            />
            <button
              onClick={addStaffNote}
              disabled={isLoading || !note.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-dark disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowNoteInput(false);
                setNote("");
              }}
              className="px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* View Full Order Link */}
        <a
          href={`/admin/orders/${order.id}`}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors ml-auto"
        >
          View Details →
        </a>
      </div>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <ConfirmationDialog
          isOpen={showConfirmDialog}
          onClose={() => {
            setShowConfirmDialog(false);
            setConfirmAction(null);
          }}
          onConfirm={handleConfirm}
          title={confirmAction.title}
          description={confirmAction.description}
          confirmText="yes"
          confirmLabel="Confirm"
          variant={confirmAction.variant}
        />
      )}

      {/* Tracking Number Dialog */}
      <TrackingNumberDialog
        isOpen={showTrackingDialog}
        onClose={() => setShowTrackingDialog(false)}
        onConfirm={handleTrackingSubmit}
        title="Mark Order as Shipped"
        description={`Enter the Canada Post tracking number for order #${order.orderNumber}. This will be sent to the customer via email.`}
        placeholder="e.g., 1234567890123456"
        confirmLabel="Mark as Shipped"
      />
    </>
  );
}


"use client";

import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  confirmLabel?: string;
  variant?: "danger" | "success" | "default";
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "yes",
  confirmLabel = "Confirm",
  variant = "default",
}: ConfirmationDialogProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset input when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setInputValue("");
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (inputValue.trim().toLowerCase() === confirmText.toLowerCase()) {
      onConfirm();
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  const isValid = inputValue.trim().toLowerCase() === confirmText.toLowerCase();

  const buttonColorClass = 
    variant === "danger" 
      ? "bg-red-600 hover:bg-red-700" 
      : variant === "success"
      ? "bg-green-600 hover:bg-green-700"
      : "bg-primary hover:bg-primary-dark";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 bg-white border-border-primary overflow-hidden">
        <div className="p-6 space-y-4">
          <div>
            <DialogTitle className="text-lg font-semibold text-text-primary">
              {title}
            </DialogTitle>
            <DialogDescription className="text-sm text-text-muted mt-2">
              {description}
            </DialogDescription>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Type <span className="font-mono font-bold text-primary">{confirmText}</span> to confirm
            </label>
            <input
              ref={inputRef}
              type="text"
              placeholder={`Type "${confirmText}" here...`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-3 border border-border-primary rounded-lg text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-6 py-4 bg-bg-alt/50 border-t border-border-primary">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-white border border-border-primary text-text-primary hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${buttonColorClass}`}
          >
            {confirmLabel}
          </button>
        </div>

        {/* Hint text */}
        <div className="px-6 py-3 text-xs text-text-muted bg-bg-alt/30 border-t border-border-primary">
          <span className="flex items-center gap-2">
            <kbd className="px-2 py-0.5 text-xs bg-white border border-border-primary rounded">Enter</kbd>
            to confirm
            <span className="mx-2">•</span>
            <kbd className="px-2 py-0.5 text-xs bg-white border border-border-primary rounded">Esc</kbd>
            to cancel
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}


"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "type" | "name" | "email" | "phone" | "message" | "submitting" | "success" | "error";

const inquiryTypes = [
  { id: "general", label: "General Inquiry", icon: "💬" },
  { id: "products", label: "Product Questions", icon: "🌿" },
  { id: "orders", label: "Order Support", icon: "📦" },
  { id: "wholesale", label: "Wholesale Inquiry", icon: "🤝" },
  { id: "feedback", label: "Feedback", icon: "⭐" },
];

export function ContactDialog({ open, onOpenChange }: ContactDialogProps) {
  const [step, setStep] = useState<Step>("type");
  const [formData, setFormData] = useState({
    type: "",
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [responseMessage, setResponseMessage] = useState("");

  const resetForm = useCallback(() => {
    setStep("type");
    setFormData({ type: "", name: "", email: "", phone: "", message: "" });
    setErrors({});
    setResponseMessage("");
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(resetForm, 300); // Reset after close animation
  }, [onOpenChange, resetForm]);

  // Validation functions
  const validateName = (name: string): string | null => {
    if (!name.trim()) return "Please enter your name";
    if (name.trim().length < 2) return "Name must be at least 2 characters";
    return null;
  };

  const validateEmail = (email: string): string | null => {
    if (!email.trim()) return "Please enter your email";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    return null;
  };

  const validatePhone = (phone: string): string | null => {
    if (phone && phone.length > 0) {
      const phoneRegex = /^[\d\s\-\(\)\+]{10,}$/;
      if (!phoneRegex.test(phone.replace(/\s/g, ""))) {
        return "Please enter a valid phone number";
      }
    }
    return null; // Phone is optional
  };

  const validateMessage = (message: string): string | null => {
    if (!message.trim()) return "Please enter your message";
    if (message.trim().length < 10) return "Message must be at least 10 characters";
    return null;
  };

  const handleNext = useCallback(() => {
    let error: string | null = null;

    switch (step) {
      case "type":
        if (!formData.type) {
          setErrors({ type: "Please select an inquiry type" });
          return;
        }
        setStep("name");
        break;

      case "name":
        error = validateName(formData.name);
        if (error) {
          setErrors({ name: error });
          return;
        }
        setErrors({});
        setStep("email");
        break;

      case "email":
        error = validateEmail(formData.email);
        if (error) {
          setErrors({ email: error });
          return;
        }
        setErrors({});
        setStep("phone");
        break;

      case "phone":
        error = validatePhone(formData.phone);
        if (error) {
          setErrors({ phone: error });
          return;
        }
        setErrors({});
        setStep("message");
        break;

      case "message":
        error = validateMessage(formData.message);
        if (error) {
          setErrors({ message: error });
          return;
        }
        setErrors({});
        handleSubmit();
        break;
    }
  }, [step, formData]);

  const handleBack = useCallback(() => {
    setErrors({});
    switch (step) {
      case "name":
        setStep("type");
        break;
      case "email":
        setStep("name");
        break;
      case "phone":
        setStep("email");
        break;
      case "message":
        setStep("phone");
        break;
    }
  }, [step]);

  const handleSubmit = async () => {
    setStep("submitting");

    try {
      const response = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          message: formData.message,
          type: inquiryTypes.find((t) => t.id === formData.type)?.label || "General",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResponseMessage(data.message);
        setStep("success");
      } else {
        setResponseMessage(data.message || "Something went wrong. Please try again.");
        setStep("error");
      }
    } catch (error) {
      setResponseMessage("Network error. Please check your connection and try again.");
      setStep("error");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && step !== "message") {
      e.preventDefault();
      handleNext();
    }
  };

  const progressSteps = ["type", "name", "email", "phone", "message"];
  const currentStepIndex = progressSteps.indexOf(step);
  const progress = step === "success" || step === "error" ? 100 : 
    step === "submitting" ? 95 :
    ((currentStepIndex + 1) / progressSteps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-white">
        {/* Progress Bar */}
        <div className="h-1 bg-gray-100">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-6">
          {/* Header */}
          {step !== "success" && step !== "error" && step !== "submitting" && (
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-bold text-text-primary text-center">
                Get in Touch
              </DialogTitle>
              <p className="text-text-muted text-center text-sm mt-1">
                {step === "type" && "What can we help you with?"}
                {step === "name" && "What's your name?"}
                {step === "email" && "How can we reach you?"}
                {step === "phone" && "Add your phone (optional)"}
                {step === "message" && "Tell us more"}
              </p>
            </DialogHeader>
          )}

          {/* Step Content */}
          <div className="min-h-[200px] flex flex-col justify-center">
            {/* Type Selection */}
            {step === "type" && (
              <div className="space-y-3">
                {inquiryTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setFormData({ ...formData, type: type.id });
                      setErrors({});
                    }}
                    className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${
                      formData.type === type.id
                        ? "border-primary bg-primary/5"
                        : "border-border-primary hover:border-primary/50"
                    }`}
                  >
                    <span className="text-2xl">{type.icon}</span>
                    <span className={`font-medium ${formData.type === type.id ? "text-primary" : "text-text-primary"}`}>
                      {type.label}
                    </span>
                  </button>
                ))}
                {errors.type && (
                  <p className="text-red-500 text-sm text-center mt-2">{errors.type}</p>
                )}
              </div>
            )}

            {/* Name Input */}
            {step === "name" && (
              <div className="space-y-4">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors({});
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Your full name"
                  autoFocus
                  className={`w-full p-4 text-lg border-2 rounded-xl transition-colors ${
                    errors.name 
                      ? "border-red-400 focus:border-red-500" 
                      : "border-border-primary focus:border-primary"
                  } outline-none`}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm">{errors.name}</p>
                )}
              </div>
            )}

            {/* Email Input */}
            {step === "email" && (
              <div className="space-y-4">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) setErrors({});
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="your@email.com"
                  autoFocus
                  className={`w-full p-4 text-lg border-2 rounded-xl transition-colors ${
                    errors.email 
                      ? "border-red-400 focus:border-red-500" 
                      : "border-border-primary focus:border-primary"
                  } outline-none`}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm">{errors.email}</p>
                )}
              </div>
            )}

            {/* Phone Input */}
            {step === "phone" && (
              <div className="space-y-4">
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (errors.phone) setErrors({});
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="(555) 555-5555"
                  autoFocus
                  className={`w-full p-4 text-lg border-2 rounded-xl transition-colors ${
                    errors.phone 
                      ? "border-red-400 focus:border-red-500" 
                      : "border-border-primary focus:border-primary"
                  } outline-none`}
                />
                <p className="text-text-muted text-sm text-center">
                  Optional - helps us reach you faster
                </p>
                {errors.phone && (
                  <p className="text-red-500 text-sm">{errors.phone}</p>
                )}
              </div>
            )}

            {/* Message Input */}
            {step === "message" && (
              <div className="space-y-4">
                <textarea
                  value={formData.message}
                  onChange={(e) => {
                    setFormData({ ...formData, message: e.target.value });
                    if (errors.message) setErrors({});
                  }}
                  placeholder="How can we help you today?"
                  autoFocus
                  rows={5}
                  className={`w-full p-4 text-base border-2 rounded-xl transition-colors resize-none ${
                    errors.message 
                      ? "border-red-400 focus:border-red-500" 
                      : "border-border-primary focus:border-primary"
                  } outline-none`}
                />
                {errors.message && (
                  <p className="text-red-500 text-sm">{errors.message}</p>
                )}
              </div>
            )}

            {/* Submitting State */}
            {step === "submitting" && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                <p className="text-text-primary font-medium">Sending your message...</p>
              </div>
            )}

            {/* Success State */}
            {step === "success" && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">Message Sent!</h3>
                <p className="text-text-muted mb-6">{responseMessage}</p>
                <button
                  onClick={handleClose}
                  className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
                >
                  Done
                </button>
              </div>
            )}

            {/* Error State */}
            {step === "error" && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">Oops!</h3>
                <p className="text-text-muted mb-6">{responseMessage}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep("message")}
                    className="px-6 py-3 border border-border-primary text-text-primary rounded-lg font-medium hover:bg-bg-alt transition-colors"
                  >
                    Try Again
                  </button>
                  <a
                    href="mailto:info@healingroomsixnations.ca"
                    className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
                  >
                    Email Us
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          {step !== "submitting" && step !== "success" && step !== "error" && (
            <div className="flex gap-3 mt-6">
              {step !== "type" && (
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 border border-border-primary text-text-primary rounded-lg font-medium hover:bg-bg-alt transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex-1 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
              >
                {step === "message" ? "Send Message" : "Continue"}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


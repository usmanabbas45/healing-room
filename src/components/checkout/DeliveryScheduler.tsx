"use client";

import { useState, useEffect } from "react";
import {
  LOCAL_DELIVERY_CONFIG,
  getSameDayDeliveryStatus,
  getNextDeliveryDate,
  getDeliveryCoverageAreasText,
  getDeliveryRequirementsText,
} from "@/libs/local-delivery-config";

interface DeliverySchedulerProps {
  deliveryDate: string;
  setDeliveryDate: (date: string) => void;
  deliveryInstructions: string;
  setDeliveryInstructions: (instructions: string) => void;
  orderTotal: number;
}

export default function DeliveryScheduler({
  deliveryDate,
  setDeliveryDate,
  deliveryInstructions,
  setDeliveryInstructions,
  orderTotal,
}: DeliverySchedulerProps) {
  const [sameDayStatus, setSameDayStatus] = useState(getSameDayDeliveryStatus());
  
  // Update same-day status every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setSameDayStatus(getSameDayDeliveryStatus());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);
  
  const nextDeliveryDate = getNextDeliveryDate();
  const minDate = nextDeliveryDate.toISOString().split("T")[0];
  
  return (
    <div className="space-y-4 lg:space-y-6">
      <h2 className="text-lg lg:text-xl font-semibold text-text-primary">
        Schedule Your Delivery
      </h2>
      
      {/* Same-Day Delivery Notice */}
      <div
        className={`p-4 rounded-xl border-2 ${
          sameDayStatus.available
            ? "bg-green-50 border-green-200"
            : "bg-yellow-50 border-yellow-200"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            {sameDayStatus.available ? (
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <p
              className={`font-medium text-sm lg:text-base ${
                sameDayStatus.available ? "text-green-800" : "text-yellow-800"
              }`}
            >
              {sameDayStatus.message}
            </p>
            <p className="text-xs mt-1 opacity-75">
              {sameDayStatus.available
                ? `Cutoff time: ${sameDayStatus.cutoffTime} • We deliver once per day during our afternoon delivery run.`
                : "We deliver once per day during our afternoon delivery run."}
            </p>
          </div>
        </div>
      </div>
      
      {/* Date Picker */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Delivery Date *
        </label>
        <input
          type="date"
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
          min={minDate}
          className="w-full px-4 py-3 text-base border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          required
        />
        <p className="text-xs text-text-muted mt-1.5">
          Select your preferred delivery date
        </p>
      </div>
      
      {/* Delivery Coverage Areas */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">Delivery Coverage Areas</p>
            <p className="text-xs text-blue-800 mt-1">
              {getDeliveryCoverageAreasText()}, and areas in between
            </p>
            <p className="text-xs text-blue-700 mt-2 font-medium">
              Rate: ${LOCAL_DELIVERY_CONFIG.perKilometerRate.toFixed(2)}/km from our store (7147 Indian Line Rd)
            </p>
          </div>
        </div>
      </div>
      
      {/* ID Requirements */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-900">⚠️ Delivery Requirements</p>
            <p className="text-xs text-yellow-800 mt-1">
              {getDeliveryRequirementsText(orderTotal)}
            </p>
          </div>
        </div>
      </div>
      
      {/* Payment Notice */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-primary">💳 Payment Required Before Delivery</p>
            <p className="text-xs text-text-muted mt-2">
              Send e-Transfer to: <span className="font-medium text-primary">{LOCAL_DELIVERY_CONFIG.payment.email}</span>
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2 mt-2">
              <p className="text-xs text-yellow-900 font-medium">
                ⚠️ REQUIRED: Include your order number in the e-transfer message field
              </p>
              <p className="text-xs text-yellow-800 mt-1">
                We use this to confirm and process your order
              </p>
            </div>
            <p className="text-xs text-red-700 font-medium mt-2">
              🚫 No cash accepted at delivery
            </p>
          </div>
        </div>
      </div>
      
      {/* Delivery Instructions */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Delivery Instructions (Optional)
        </label>
        <textarea
          value={deliveryInstructions}
          onChange={(e) => setDeliveryInstructions(e.target.value)}
          className="w-full px-4 py-3 text-base border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          rows={3}
          placeholder="Gate codes, building entry instructions, buzzer numbers, etc."
        />
        <p className="text-xs text-text-muted mt-1.5">
          Help our delivery driver find you easily
        </p>
      </div>
    </div>
  );
}


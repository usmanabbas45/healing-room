"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Loader } from "@/components/common/Loader";
import {
  DELIVERY_FEES,
  SHIPPING_FEES,
  DELIVERY_TIME_SLOTS,
  ETRANSFER_CONFIG,
  DELIVERY_RADIUS_KM,
  isSameDayDeliveryAvailable,
  getNextDeliveryDate,
} from "@/libs/delivery-config";

interface CartItem {
  productId: string;
  productName: string;
  category: string;
  size: string;
  quantity: number;
  price: number;
  image?: string;
}

interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
}

type FulfillmentMethod = "pickup" | "delivery" | "shipping";
type Step = "fulfillment" | "address" | "schedule" | "review" | "payment";

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState<Step>("fulfillment");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Form state
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState({
    line1: "",
    line2: "",
    city: "",
    province: "ON",
    postalCode: "",
  });
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState<string>("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [contactInfo, setContactInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });
  
  // Calculated values
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = fulfillmentMethod === "pickup" ? 0 :
    fulfillmentMethod === "delivery" ? 
      (subtotal >= DELIVERY_FEES.freeDeliveryMinimum ? 0 : DELIVERY_FEES.tiers[0].fee) :
      (subtotal >= SHIPPING_FEES.freeShippingMinimum ? 0 : SHIPPING_FEES.standard);
  const total = subtotal + deliveryFee;
  
  // Load cart and user data
  useEffect(() => {
    if (status === "loading") return;
    
    if (status === "unauthenticated") {
      router.push("/login?redirect=/checkout");
      return;
    }
    
    const loadData = async () => {
      try {
        // Load cart
        const cartRes = await fetch("/api/cart");
        if (cartRes.ok) {
          const cartData = await cartRes.json();
          if (!cartData.items || cartData.items.length === 0) {
            toast.error("Your cart is empty");
            router.push("/cart");
            return;
          }
          setCartItems(cartData.items);
        }
        
        // Load user profile
        const profileRes = await fetch("/api/user/profile");
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setUserProfile(profileData.user);
          setContactInfo({
            name: profileData.user.name || "",
            email: profileData.user.email || "",
            phone: profileData.user.phone || "",
          });
          // Pre-fill delivery address if user has saved address
          if (profileData.user.addressLine1) {
            setDeliveryAddress({
              line1: profileData.user.addressLine1 || "",
              line2: profileData.user.addressLine2 || "",
              city: profileData.user.city || "",
              province: profileData.user.province || "ON",
              postalCode: profileData.user.postalCode || "",
            });
          }
        }
      } catch (error) {
        console.error("Error loading checkout data:", error);
        toast.error("Failed to load checkout data");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [status, router]);
  
  // Set default delivery date
  useEffect(() => {
    const nextDate = getNextDeliveryDate();
    setDeliveryDate(nextDate.toISOString().split("T")[0]);
  }, []);
  
  const steps: { id: Step; label: string }[] = [
    { id: "fulfillment", label: "Fulfillment" },
    { id: "address", label: "Details" },
    { id: "schedule", label: "Schedule" },
    { id: "review", label: "Review" },
    { id: "payment", label: "Payment" },
  ];
  
  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  
  const canProceed = () => {
    switch (currentStep) {
      case "fulfillment":
        return true;
      case "address":
        if (fulfillmentMethod === "pickup") {
          return contactInfo.name && contactInfo.email;
        }
        return (
          contactInfo.name &&
          contactInfo.email &&
          deliveryAddress.line1 &&
          deliveryAddress.city &&
          deliveryAddress.postalCode
        );
      case "schedule":
        if (fulfillmentMethod === "pickup") return true;
        return deliveryDate && deliveryTimeSlot;
      case "review":
        return true;
      default:
        return false;
    }
  };
  
  const nextStep = () => {
    if (!canProceed()) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    const idx = currentStepIndex;
    // Skip schedule step for pickup
    if (currentStep === "address" && fulfillmentMethod === "pickup") {
      setCurrentStep("review");
    } else if (idx < steps.length - 1) {
      setCurrentStep(steps[idx + 1].id);
    }
  };
  
  const prevStep = () => {
    const idx = currentStepIndex;
    // Skip schedule step for pickup
    if (currentStep === "review" && fulfillmentMethod === "pickup") {
      setCurrentStep("address");
    } else if (idx > 0) {
      setCurrentStep(steps[idx - 1].id);
    }
  };
  
  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    
    try {
      const orderData = {
        fulfillmentMethod,
        contactInfo,
        deliveryAddress: fulfillmentMethod !== "pickup" ? deliveryAddress : null,
        deliveryDate: fulfillmentMethod !== "pickup" ? deliveryDate : null,
        deliveryTimeSlot: fulfillmentMethod !== "pickup" ? deliveryTimeSlot : null,
        deliveryInstructions: fulfillmentMethod !== "pickup" ? deliveryInstructions : null,
        subtotal,
        deliveryFee,
        totalPrice: total,
      };
      
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to create order");
      }
      
      // Redirect to payment instructions page
      router.push(`/checkout/payment/${data.orderNumber}`);
      
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Failed to place order");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader height={40} width={40} />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-bg-alt py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/cart" className="text-primary hover:underline text-sm mb-4 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Cart
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">Checkout</h1>
        </div>
        
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => {
              // Hide schedule step for pickup
              if (step.id === "schedule" && fulfillmentMethod === "pickup") return null;
              
              const isActive = step.id === currentStep;
              const isCompleted = currentStepIndex > idx;
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary text-white"
                          : isCompleted
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-text-muted"
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span className={`text-xs mt-1 ${isActive ? "text-primary font-medium" : "text-text-muted"}`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < steps.length - 1 && !(step.id === "address" && fulfillmentMethod === "pickup") && (
                    <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? "bg-green-500" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-border-primary p-6">
              {/* Step 1: Fulfillment Method */}
              {currentStep === "fulfillment" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-text-primary">How would you like to receive your order?</h2>
                  
                  <div className="space-y-3">
                    {/* Pickup Option */}
                    <label
                      className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                        fulfillmentMethod === "pickup"
                          ? "border-primary bg-primary/5"
                          : "border-border-primary hover:border-primary/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="fulfillment"
                        value="pickup"
                        checked={fulfillmentMethod === "pickup"}
                        onChange={() => setFulfillmentMethod("pickup")}
                        className="mt-1 text-primary focus:ring-primary"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-text-primary">Store Pickup</span>
                          <span className="text-green-600 font-medium">FREE</span>
                        </div>
                        <p className="text-sm text-text-muted mt-1">
                          Pick up at 7147 Indian Line Rd, Norfolk County
                        </p>
                        <p className="text-xs text-text-muted mt-1">
                          Ready within 30 minutes during store hours (9AM - 10PM)
                        </p>
                      </div>
                    </label>
                    
                    {/* Delivery Option */}
                    <label
                      className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                        fulfillmentMethod === "delivery"
                          ? "border-primary bg-primary/5"
                          : "border-border-primary hover:border-primary/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="fulfillment"
                        value="delivery"
                        checked={fulfillmentMethod === "delivery"}
                        onChange={() => setFulfillmentMethod("delivery")}
                        className="mt-1 text-primary focus:ring-primary"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-text-primary">Local Delivery</span>
                          <span className="text-text-primary font-medium">
                            {subtotal >= DELIVERY_FEES.freeDeliveryMinimum ? (
                              <span className="text-green-600">FREE</span>
                            ) : (
                              `From $${DELIVERY_FEES.tiers[0].fee.toFixed(2)}`
                            )}
                          </span>
                        </div>
                        <p className="text-sm text-text-muted mt-1">
                          Within {DELIVERY_RADIUS_KM}km of our store
                        </p>
                        <p className="text-xs text-text-muted mt-1">
                          {isSameDayDeliveryAvailable() ? "Same-day delivery available!" : "Next-day delivery"}
                          {subtotal < DELIVERY_FEES.freeDeliveryMinimum && (
                            <> • Free delivery on orders over ${DELIVERY_FEES.freeDeliveryMinimum}</>
                          )}
                        </p>
                      </div>
                    </label>
                    
                    {/* Shipping Option */}
                    <label
                      className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                        fulfillmentMethod === "shipping"
                          ? "border-primary bg-primary/5"
                          : "border-border-primary hover:border-primary/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="fulfillment"
                        value="shipping"
                        checked={fulfillmentMethod === "shipping"}
                        onChange={() => setFulfillmentMethod("shipping")}
                        className="mt-1 text-primary focus:ring-primary"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-text-primary">Shipping</span>
                          <span className="text-text-primary font-medium">
                            {subtotal >= SHIPPING_FEES.freeShippingMinimum ? (
                              <span className="text-green-600">FREE</span>
                            ) : (
                              `$${SHIPPING_FEES.standard.toFixed(2)}`
                            )}
                          </span>
                        </div>
                        <p className="text-sm text-text-muted mt-1">
                          Canada-wide shipping
                        </p>
                        <p className="text-xs text-text-muted mt-1">
                          2-5 business days
                          {subtotal < SHIPPING_FEES.freeShippingMinimum && (
                            <> • Free shipping on orders over ${SHIPPING_FEES.freeShippingMinimum}</>
                          )}
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
              
              {/* Step 2: Address / Contact Info */}
              {currentStep === "address" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-text-primary">
                    {fulfillmentMethod === "pickup" ? "Contact Information" : "Delivery Details"}
                  </h2>
                  
                  {/* Contact Info */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-text-primary">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={contactInfo.name}
                          onChange={(e) => setContactInfo({ ...contactInfo, name: e.target.value })}
                          className="w-full px-4 py-2.5 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={contactInfo.email}
                          onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                          className="w-full px-4 py-2.5 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-text-primary mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={contactInfo.phone}
                          onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                          className="w-full px-4 py-2.5 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          placeholder="(555) 555-5555"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Delivery Address */}
                  {fulfillmentMethod !== "pickup" && (
                    <div className="space-y-4 pt-4 border-t border-border-primary">
                      <h3 className="font-medium text-text-primary">
                        {fulfillmentMethod === "delivery" ? "Delivery" : "Shipping"} Address
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-1">
                            Street Address *
                          </label>
                          <input
                            type="text"
                            value={deliveryAddress.line1}
                            onChange={(e) => setDeliveryAddress({ ...deliveryAddress, line1: e.target.value })}
                            className="w-full px-4 py-2.5 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            placeholder="123 Main St"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-1">
                            Apt, Suite, Unit (Optional)
                          </label>
                          <input
                            type="text"
                            value={deliveryAddress.line2}
                            onChange={(e) => setDeliveryAddress({ ...deliveryAddress, line2: e.target.value })}
                            className="w-full px-4 py-2.5 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            placeholder="Apt 4B"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">
                              City *
                            </label>
                            <input
                              type="text"
                              value={deliveryAddress.city}
                              onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
                              className="w-full px-4 py-2.5 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">
                              Province *
                            </label>
                            <select
                              value={deliveryAddress.province}
                              onChange={(e) => setDeliveryAddress({ ...deliveryAddress, province: e.target.value })}
                              className="w-full px-4 py-2.5 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                            >
                              <option value="ON">Ontario</option>
                              <option value="BC">British Columbia</option>
                              <option value="AB">Alberta</option>
                              <option value="SK">Saskatchewan</option>
                              <option value="MB">Manitoba</option>
                              <option value="QC">Quebec</option>
                              <option value="NB">New Brunswick</option>
                              <option value="NS">Nova Scotia</option>
                              <option value="PE">Prince Edward Island</option>
                              <option value="NL">Newfoundland</option>
                              <option value="YT">Yukon</option>
                              <option value="NT">Northwest Territories</option>
                              <option value="NU">Nunavut</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-1">
                            Postal Code *
                          </label>
                          <input
                            type="text"
                            value={deliveryAddress.postalCode}
                            onChange={(e) => setDeliveryAddress({ ...deliveryAddress, postalCode: e.target.value.toUpperCase() })}
                            className="w-full px-4 py-2.5 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            placeholder="A1B 2C3"
                            maxLength={7}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Step 3: Schedule (Delivery/Shipping only) */}
              {currentStep === "schedule" && fulfillmentMethod !== "pickup" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-text-primary">
                    {fulfillmentMethod === "delivery" ? "Choose Delivery Time" : "Shipping Speed"}
                  </h2>
                  
                  {fulfillmentMethod === "delivery" && (
                    <>
                      {/* Delivery Date */}
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Delivery Date *
                        </label>
                        <input
                          type="date"
                          value={deliveryDate}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                          min={getNextDeliveryDate().toISOString().split("T")[0]}
                          className="w-full px-4 py-2.5 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                        {isSameDayDeliveryAvailable() && (
                          <p className="text-sm text-green-600 mt-1">
                            Same-day delivery is available!
                          </p>
                        )}
                      </div>
                      
                      {/* Time Slot */}
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Time Slot *
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {DELIVERY_TIME_SLOTS.map((slot) => (
                            <label
                              key={slot.id}
                              className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                                deliveryTimeSlot === slot.id
                                  ? "border-primary bg-primary/5"
                                  : "border-border-primary hover:border-primary/50"
                              }`}
                            >
                              <input
                                type="radio"
                                name="timeSlot"
                                value={slot.id}
                                checked={deliveryTimeSlot === slot.id}
                                onChange={() => setDeliveryTimeSlot(slot.id)}
                                className="sr-only"
                              />
                              <span className={deliveryTimeSlot === slot.id ? "text-primary font-medium" : "text-text-primary"}>
                                {slot.label}
                              </span>
                            </label>
                          ))}
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
                          className="w-full px-4 py-2.5 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          rows={3}
                          placeholder="Gate code, building instructions, etc."
                        />
                      </div>
                    </>
                  )}
                  
                  {fulfillmentMethod === "shipping" && (
                    <div className="space-y-3">
                      <label
                        className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-colors border-primary bg-primary/5`}
                      >
                        <input type="radio" checked readOnly className="mt-1 text-primary" />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-text-primary">Standard Shipping</span>
                            <span className="font-medium text-text-primary">
                              {subtotal >= SHIPPING_FEES.freeShippingMinimum ? (
                                <span className="text-green-600">FREE</span>
                              ) : (
                                `$${SHIPPING_FEES.standard.toFixed(2)}`
                              )}
                            </span>
                          </div>
                          <p className="text-sm text-text-muted mt-1">2-5 business days</p>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              )}
              
              {/* Step 4: Review Order */}
              {currentStep === "review" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-text-primary">Review Your Order</h2>
                  
                  {/* Fulfillment Summary */}
                  <div className="bg-bg-alt rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-text-primary">
                        {fulfillmentMethod === "pickup" ? "Store Pickup" :
                         fulfillmentMethod === "delivery" ? "Local Delivery" : "Shipping"}
                      </span>
                      <button
                        onClick={() => setCurrentStep("fulfillment")}
                        className="text-primary text-sm hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    {fulfillmentMethod === "pickup" ? (
                      <p className="text-sm text-text-muted">7147 Indian Line Rd, Norfolk County</p>
                    ) : (
                      <>
                        <p className="text-sm text-text-muted">
                          {deliveryAddress.line1}
                          {deliveryAddress.line2 && `, ${deliveryAddress.line2}`}
                        </p>
                        <p className="text-sm text-text-muted">
                          {deliveryAddress.city}, {deliveryAddress.province} {deliveryAddress.postalCode}
                        </p>
                        {fulfillmentMethod === "delivery" && deliveryTimeSlot && (
                          <p className="text-sm text-primary mt-2">
                            {new Date(deliveryDate).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}
                            {" • "}
                            {DELIVERY_TIME_SLOTS.find(s => s.id === deliveryTimeSlot)?.label}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Contact Summary */}
                  <div className="bg-bg-alt rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-text-primary">Contact</span>
                      <button
                        onClick={() => setCurrentStep("address")}
                        className="text-primary text-sm hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <p className="text-sm text-text-muted">{contactInfo.name}</p>
                    <p className="text-sm text-text-muted">{contactInfo.email}</p>
                    {contactInfo.phone && <p className="text-sm text-text-muted">{contactInfo.phone}</p>}
                  </div>
                  
                  {/* Items Summary */}
                  <div>
                    <h3 className="font-medium text-text-primary mb-3">Items ({cartItems.length})</h3>
                    <div className="space-y-3">
                      {cartItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-3 bg-bg-alt rounded-lg">
                          <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                            {item.image ? (
                              <Image src={item.image} alt={item.productName} width={64} height={64} className="object-contain" />
                            ) : (
                              <Image src="/logo.png" alt="Product" width={40} height={40} className="opacity-50" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-text-primary truncate">{item.productName}</p>
                            <p className="text-sm text-text-muted">{item.size} × {item.quantity}</p>
                          </div>
                          <p className="font-medium text-text-primary">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Step 5: Payment */}
              {currentStep === "payment" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-text-primary">Payment</h2>
                  
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-primary mb-2">Interac e-Transfer</h3>
                        <p className="text-sm text-text-muted mb-4">
                          After placing your order, you&apos;ll receive instructions to send an e-Transfer. 
                          Once payment is received, we&apos;ll process your order immediately.
                        </p>
                        <div className="bg-white rounded-lg p-4 border border-border-primary">
                          <p className="text-sm"><span className="font-medium">Send to:</span> {ETRANSFER_CONFIG.recipientEmail}</p>
                          <p className="text-sm mt-1"><span className="font-medium">Amount:</span> ${total.toFixed(2)}</p>
                          <p className="text-sm mt-1 text-text-muted">
                            Include your order number in the message field
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Your order will be held until payment is confirmed. 
                      Please send the e-Transfer within 24 hours to avoid cancellation.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t border-border-primary">
                <button
                  onClick={prevStep}
                  disabled={currentStepIndex === 0}
                  className="px-6 py-2.5 border border-border-primary rounded-lg text-text-primary hover:bg-bg-alt transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </button>
                
                {currentStep !== "payment" ? (
                  <button
                    onClick={nextStep}
                    disabled={!canProceed()}
                    className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitOrder}
                    disabled={isSubmitting}
                    className="px-8 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader height={18} width={18} />
                        Placing Order...
                      </>
                    ) : (
                      <>
                        Place Order • ${total.toFixed(2)}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-border-primary p-6 sticky top-24">
              <h3 className="font-semibold text-text-primary mb-4">Order Summary</h3>
              
              {/* Cart Items Preview */}
              <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                {cartItems.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-bg-alt rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                      {item.image ? (
                        <Image src={item.image} alt={item.productName} width={48} height={48} className="object-contain" />
                      ) : (
                        <Image src="/logo.png" alt="Product" width={30} height={30} className="opacity-50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{item.productName}</p>
                      <p className="text-xs text-text-muted">{item.size} × {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium text-text-primary">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
                {cartItems.length > 3 && (
                  <p className="text-sm text-text-muted text-center">+{cartItems.length - 3} more items</p>
                )}
              </div>
              
              <div className="border-t border-border-primary pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Subtotal</span>
                  <span className="text-text-primary">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">
                    {fulfillmentMethod === "pickup" ? "Pickup" :
                     fulfillmentMethod === "delivery" ? "Delivery" : "Shipping"}
                  </span>
                  <span className={deliveryFee === 0 ? "text-green-600" : "text-text-primary"}>
                    {deliveryFee === 0 ? "FREE" : `$${deliveryFee.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t border-border-primary">
                  <span className="text-text-primary">Total</span>
                  <span className="text-primary">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


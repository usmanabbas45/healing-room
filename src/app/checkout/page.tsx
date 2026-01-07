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
import { 
  calculateLocalDeliveryFee,
  getNextDeliveryDate as getLocalDeliveryDate,
} from "@/libs/local-delivery-config";
import DeliveryScheduler from "@/components/checkout/DeliveryScheduler";
import DeliveryAreaValidator from "@/components/checkout/DeliveryAreaValidator";

interface CartItem {
  productId: string;
  productName: string;
  category: string;
  size: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  discountAmount?: number;
  offerName?: string;
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
  
  // New state for delivery distance and fee calculation
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null);
  const [calculatedDeliveryFee, setCalculatedDeliveryFee] = useState<number | null>(null);
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [addressValidationError, setAddressValidationError] = useState<string | null>(null);
  const [triggerAddressValidation, setTriggerAddressValidation] = useState(false);
  
  // Calculated values
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalSavings = cartItems.reduce((sum, item) => {
    if (item.originalPrice && item.originalPrice > item.price) {
      return sum + (item.originalPrice - item.price) * item.quantity;
    }
    return sum;
  }, 0);
  const deliveryFee = fulfillmentMethod === "pickup" ? 0 :
    fulfillmentMethod === "delivery" ? 
      (calculatedDeliveryFee !== null ? calculatedDeliveryFee : 0) : // Use calculated fee for delivery
      SHIPPING_FEES.xpresspost; // Flat $25 Xpresspost rate
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
    const nextDate = getLocalDeliveryDate();
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
        // For delivery, require address fields (validation happens on Continue click)
        if (fulfillmentMethod === "delivery") {
          return (
            contactInfo.name &&
            contactInfo.email &&
            deliveryAddress.line1 &&
            deliveryAddress.city &&
            deliveryAddress.postalCode
          );
        }
        // For shipping
        return (
          contactInfo.name &&
          contactInfo.email &&
          deliveryAddress.line1 &&
          deliveryAddress.city &&
          deliveryAddress.postalCode
        );
      case "schedule":
        if (fulfillmentMethod === "pickup") return true;
        if (fulfillmentMethod === "delivery") {
          return deliveryDate; // No time slot needed for delivery (daily run)
        }
        return deliveryDate && deliveryTimeSlot;
      case "review":
        return true;
      default:
        return false;
    }
  };
  
  const nextStep = () => {
    // Special handling for delivery address validation
    if (currentStep === "address" && fulfillmentMethod === "delivery") {
      // Check if address fields are filled
      if (!deliveryAddress.line1 || !deliveryAddress.city || !deliveryAddress.postalCode) {
        toast.error("Please fill in all required address fields");
        return;
      }
      
      // If not yet validated, trigger validation
      if (calculatedDeliveryFee === null && !addressValidationError) {
        toast.info("Validating delivery address...");
        setTriggerAddressValidation(true);
        return; // Wait for validation to complete
      }
      
      // If validation failed, show error
      if (addressValidationError) {
        toast.error("Please fix the delivery address issues");
        return;
      }
    }
    
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
      // Validate discounts are still active before submitting
      const itemsWithActiveDiscounts = [];
      let discountsChanged = false;
      
      for (const item of cartItems) {
        if (item.originalPrice && item.originalPrice > item.price) {
          // Item has a discount, validate it's still active
          const response = await fetch(`/api/validate-discount`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: item.productId }),
          });
          
          const validationResult = await response.json();
          
          if (!validationResult.isValid) {
            discountsChanged = true;
            toast.warning(`Discount for ${item.productName} is no longer available. Price updated.`);
            itemsWithActiveDiscounts.push({
              ...item,
              price: validationResult.currentPrice || item.originalPrice || item.price,
              originalPrice: undefined,
              discountPercentage: undefined,
              discountAmount: undefined,
              offerName: undefined,
            });
          } else {
            itemsWithActiveDiscounts.push(item);
          }
        } else {
          itemsWithActiveDiscounts.push(item);
        }
      }
      
      if (discountsChanged) {
        // Refresh cart items with updated prices
        setCartItems(itemsWithActiveDiscounts);
        toast.info("Please review your order with updated prices.");
        setIsSubmitting(false);
        return;
      }
      
      const orderData = {
        fulfillmentMethod,
        contactInfo,
        deliveryAddress: fulfillmentMethod !== "pickup" ? deliveryAddress : null,
        deliveryDate: fulfillmentMethod !== "pickup" ? deliveryDate : null,
        deliveryTimeSlot: fulfillmentMethod === "shipping" ? deliveryTimeSlot : null, // Only for shipping
        deliveryInstructions: fulfillmentMethod !== "pickup" ? deliveryInstructions : null,
        deliveryDistance: fulfillmentMethod === "delivery" ? deliveryDistance : null,
        deliveryCoords: fulfillmentMethod === "delivery" ? deliveryCoords : null,
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
    <section className="pt-4 pb-32 lg:pb-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Checkout</h1>
          <p className="text-sm text-text-muted mt-1">
            {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} • ${total.toFixed(2)}
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8 pt-4 lg:pt-0">
          {/* Main Content */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="bg-white rounded-xl shadow-sm border border-border-primary p-4 lg:p-6">
              {/* Step 1: Fulfillment Method */}
              {currentStep === "fulfillment" && (
                <div className="space-y-4 lg:space-y-6">
                  <h2 className="text-lg lg:text-xl font-semibold text-text-primary">How would you like to receive your order?</h2>
                  
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
                          <span className="text-text-primary font-medium text-sm">
                            $0.50/km
                          </span>
                        </div>
                        <p className="text-sm text-text-muted mt-1">
                          Six Nations, Brantford, Hamilton, Caledonia & more
                        </p>
                        <p className="text-xs text-text-muted mt-1">
                          {isSameDayDeliveryAvailable() ? "Same-day delivery available (order before 1 PM)!" : "Next-day delivery (ordered after 1 PM)"}
                        </p>
                        <p className="text-xs text-primary font-medium mt-1">
                          One delivery run per day
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
                          <span className="font-medium text-text-primary">Canada Post Xpresspost</span>
                          <span className="text-text-primary font-medium">
                            ${SHIPPING_FEES.xpresspost.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-sm text-text-muted mt-1">
                          Shipping anywhere in Canada
                        </p>
                        <p className="text-xs text-text-muted mt-1">
                          2-5 business days • Includes tracking
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
              
              {/* Step 2: Address / Contact Info */}
              {currentStep === "address" && (
                <div className="space-y-4 lg:space-y-6">
                  <h2 className="text-lg lg:text-xl font-semibold text-text-primary">
                    {fulfillmentMethod === "pickup" ? "Contact Information" : "Delivery Details"}
                  </h2>
                  
                  {/* Contact Info */}
                  <div className="space-y-3 lg:space-y-4">
                    <h3 className="font-medium text-text-primary">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1.5">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={contactInfo.name}
                          onChange={(e) => setContactInfo({ ...contactInfo, name: e.target.value })}
                          className="w-full px-4 py-3 text-base border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1.5">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={contactInfo.email}
                          onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                          className="w-full px-4 py-3 text-base border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-text-primary mb-1.5">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={contactInfo.phone}
                          onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                          className="w-full px-4 py-3 text-base border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          placeholder="(555) 555-5555"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Delivery Address */}
                  {fulfillmentMethod !== "pickup" && (
                    <div className="space-y-3 lg:space-y-4 pt-4 border-t border-border-primary">
                      <h3 className="font-medium text-text-primary">
                        {fulfillmentMethod === "delivery" ? "Delivery" : "Shipping"} Address
                      </h3>
                      
                      {fulfillmentMethod === "delivery" && (
                        <p className="text-sm text-text-muted">
                          Enter your complete address to calculate the delivery fee
                        </p>
                      )}
                      <div className="space-y-3 lg:space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-1.5">
                            Street Address *
                          </label>
                          <input
                            type="text"
                            value={deliveryAddress.line1}
                            onChange={(e) => setDeliveryAddress({ ...deliveryAddress, line1: e.target.value })}
                            className="w-full px-4 py-3 text-base border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            placeholder="123 Main St"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-1.5">
                            Apt, Suite, Unit (Optional)
                          </label>
                          <input
                            type="text"
                            value={deliveryAddress.line2}
                            onChange={(e) => setDeliveryAddress({ ...deliveryAddress, line2: e.target.value })}
                            className="w-full px-4 py-3 text-base border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            placeholder="Apt 4B"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-text-primary mb-1.5">
                              City *
                            </label>
                            <input
                              type="text"
                              value={deliveryAddress.city}
                              onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
                              className="w-full px-4 py-3 text-base border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-text-primary mb-1.5">
                              Province *
                            </label>
                            <select
                              value={deliveryAddress.province}
                              onChange={(e) => setDeliveryAddress({ ...deliveryAddress, province: e.target.value })}
                              className="w-full px-4 py-3 text-base border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
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
                          <label className="block text-sm font-medium text-text-primary mb-1.5">
                            Postal Code *
                          </label>
                          <input
                            type="text"
                            value={deliveryAddress.postalCode}
                            onChange={(e) => setDeliveryAddress({ ...deliveryAddress, postalCode: e.target.value.toUpperCase() })}
                            className="w-full px-4 py-3 text-base border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            placeholder="A1B 2C3"
                            maxLength={7}
                            required
                          />
                        </div>
                      </div>
                      
                      {/* Delivery Area Validator - Only for delivery method */}
                      {fulfillmentMethod === "delivery" && (
                        <DeliveryAreaValidator
                          address={deliveryAddress}
                          triggerValidation={triggerAddressValidation}
                          onDistanceCalculated={(distance, fee, coords) => {
                            setDeliveryDistance(distance);
                            setCalculatedDeliveryFee(fee);
                            setDeliveryCoords(coords);
                            setAddressValidationError(null);
                            setTriggerAddressValidation(false); // Reset trigger
                            // Auto-proceed to next step after successful validation
                            setTimeout(() => {
                              const idx = currentStepIndex;
                              if (idx < steps.length - 1) {
                                setCurrentStep(steps[idx + 1].id);
                              }
                            }, 500);
                          }}
                          onValidationError={(error) => {
                            setDeliveryDistance(null);
                            setCalculatedDeliveryFee(null);
                            setDeliveryCoords(null);
                            setAddressValidationError(error);
                            setTriggerAddressValidation(false); // Reset trigger
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Step 3: Schedule (Delivery/Shipping only) */}
              {currentStep === "schedule" && fulfillmentMethod !== "pickup" && (
                <div className="space-y-4 lg:space-y-6">
                  {fulfillmentMethod === "delivery" ? (
                    <DeliveryScheduler
                      deliveryDate={deliveryDate}
                      setDeliveryDate={setDeliveryDate}
                      deliveryInstructions={deliveryInstructions}
                      setDeliveryInstructions={setDeliveryInstructions}
                      orderTotal={subtotal}
                    />
                  ) : (
                    <>
                  <h2 className="text-lg lg:text-xl font-semibold text-text-primary">
                        Shipping Method
                  </h2>
                  
                    <div className="space-y-3">
                      <label
                        className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-colors border-primary bg-primary/5`}
                      >
                        <input type="radio" checked readOnly className="mt-1 text-primary" />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-text-primary">Canada Post Xpresspost</span>
                            <span className="font-medium text-text-primary">
                              ${SHIPPING_FEES.xpresspost.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-sm text-text-muted mt-1">2-5 business days • Includes tracking</p>
                        </div>
                      </label>
                    </div>
                    </>
                  )}
                </div>
              )}
              
              {/* Step 4: Review Order */}
              {currentStep === "review" && (
                <div className="space-y-4 lg:space-y-6">
                  <h2 className="text-lg lg:text-xl font-semibold text-text-primary">Review Your Order</h2>
                  
                  {/* Fulfillment Summary */}
                  <div className="bg-bg-alt rounded-lg p-3 lg:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-text-primary text-sm lg:text-base">
                        {fulfillmentMethod === "pickup" ? "Store Pickup" :
                         fulfillmentMethod === "delivery" ? "Local Delivery" : "Shipping"}
                      </span>
                      <button
                        onClick={() => setCurrentStep("fulfillment")}
                        className="text-primary text-sm font-medium active:opacity-70"
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
                        {fulfillmentMethod === "delivery" && deliveryDate && (
                          <>
                          <p className="text-sm text-primary mt-2">
                            {new Date(deliveryDate).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}
                            </p>
                            {deliveryDistance && (
                              <p className="text-xs text-text-muted mt-1">
                                Distance: {deliveryDistance.toFixed(1)} km • Fee: ${calculatedDeliveryFee?.toFixed(2)}
                              </p>
                            )}
                          </>
                        )}
                        {fulfillmentMethod === "shipping" && deliveryDate && (
                          <p className="text-sm text-primary mt-2">
                            {new Date(deliveryDate).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Contact Summary */}
                  <div className="bg-bg-alt rounded-lg p-3 lg:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-text-primary text-sm lg:text-base">Contact</span>
                      <button
                        onClick={() => setCurrentStep("address")}
                        className="text-primary text-sm font-medium active:opacity-70"
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
                    <h3 className="font-medium text-text-primary mb-3 text-sm lg:text-base">Items ({cartItems.length})</h3>
                    <div className="space-y-2 lg:space-y-3">
                      {cartItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 lg:gap-4 p-2 lg:p-3 bg-bg-alt rounded-lg">
                          <div className="w-12 h-12 lg:w-16 lg:h-16 bg-white rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                            {item.image ? (
                              <Image src={item.image} alt={item.productName} width={64} height={64} className="object-contain" />
                            ) : (
                              <Image src="/logo.png" alt="Product" width={32} height={32} className="opacity-50" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-text-primary text-sm lg:text-base truncate">{item.productName}</p>
                            <p className="text-xs lg:text-sm text-text-muted">{item.size} × {item.quantity}</p>
                            {item.offerName && (
                              <p className="text-xs text-green-600 font-medium mt-1">🎉 {item.offerName}</p>
                            )}
                          </div>
                          <div className="text-right">
                            {item.originalPrice && item.originalPrice > item.price ? (
                              <>
                                <p className="font-bold text-red-600 text-sm lg:text-base">${(item.price * item.quantity).toFixed(2)}</p>
                                <p className="text-xs text-text-muted line-through">${(item.originalPrice * item.quantity).toFixed(2)}</p>
                              </>
                            ) : (
                              <p className="font-medium text-text-primary text-sm lg:text-base">${(item.price * item.quantity).toFixed(2)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Step 5: Payment */}
              {currentStep === "payment" && (
                <div className="space-y-4 lg:space-y-6">
                  <h2 className="text-lg lg:text-xl font-semibold text-text-primary">Payment</h2>
                  
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 lg:p-6">
                    <div className="flex items-start gap-3 lg:gap-4">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 lg:w-6 lg:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-text-primary mb-2 text-sm lg:text-base">Interac e-Transfer</h3>
                        <p className="text-xs lg:text-sm text-text-muted mb-3 lg:mb-4">
                          After placing your order, you&apos;ll receive instructions to send an e-Transfer. 
                          {fulfillmentMethod === "delivery" && " Payment must be received before your order goes out for delivery."}
                        </p>
                        <div className="bg-white rounded-lg p-3 lg:p-4 border border-border-primary space-y-2">
                          <p className="text-xs lg:text-sm"><span className="font-medium">Send to:</span> <span className="break-all">{ETRANSFER_CONFIG.recipientEmail}</span></p>
                          <p className="text-xs lg:text-sm"><span className="font-medium">Amount:</span> ${total.toFixed(2)}</p>
                          <div className="bg-yellow-50 border border-yellow-300 rounded px-2 py-1.5 mt-2">
                            <p className="text-xs font-bold text-yellow-900">
                              ⚠️ REQUIRED: Include your order number in the message field
                            </p>
                            <p className="text-xs text-yellow-800 mt-0.5">
                              We use this to confirm your order
                          </p>
                        </div>
                        </div>
                        {fulfillmentMethod === "delivery" && (
                          <p className="text-xs text-red-700 font-medium mt-3">
                            🚫 No cash accepted at delivery - e-Transfer payment only
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 lg:p-4">
                    <p className="text-xs lg:text-sm text-yellow-800">
                      <strong>⚠️ Important:</strong> Your order will be held until payment is confirmed. 
                      Please send the e-Transfer within 24 hours to avoid cancellation.
                    </p>
                    {fulfillmentMethod === "delivery" && (
                      <p className="text-xs lg:text-sm text-yellow-800 mt-2">
                        <strong>Delivery Process:</strong> Once payment is received, your order will be placed in the next delivery run. 
                        {isSameDayDeliveryAvailable() 
                          ? "Orders before 1 PM go out today (2-7 PM)." 
                          : "Orders after 1 PM go out tomorrow (2-7 PM)."}
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Navigation Buttons - Desktop */}
              <div className="hidden lg:flex justify-between mt-8 pt-6 border-t border-border-primary">
                {currentStepIndex > 0 ? (
                  <button
                    onClick={prevStep}
                    className="px-6 py-3 border border-border-primary rounded-lg text-text-primary hover:bg-bg-alt transition-colors"
                  >
                    Back
                  </button>
                ) : (
                  <div />
                )}
                
                {currentStep !== "payment" ? (
                  <button
                    onClick={nextStep}
                    disabled={!canProceed()}
                    className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitOrder}
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
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
          
          {/* Order Summary Sidebar - Desktop Only */}
          <div className="hidden lg:block lg:col-span-1 order-1 lg:order-2">
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
                      {item.offerName && (
                        <p className="text-xs text-green-600 font-medium">🎉 {item.offerName}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {item.originalPrice && item.originalPrice > item.price ? (
                        <>
                          <p className="text-sm font-bold text-red-600">${(item.price * item.quantity).toFixed(2)}</p>
                          <p className="text-xs text-text-muted line-through">${(item.originalPrice * item.quantity).toFixed(2)}</p>
                        </>
                      ) : (
                        <p className="text-sm font-medium text-text-primary">${(item.price * item.quantity).toFixed(2)}</p>
                      )}
                    </div>
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
                {totalSavings > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 font-medium">Savings</span>
                    <span className="text-green-600 font-medium">-${totalSavings.toFixed(2)}</span>
                  </div>
                )}
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
                {totalSavings > 0 && (
                  <div className="text-xs text-center text-green-600 font-medium">
                    You saved ${totalSavings.toFixed(2)} with active deals!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Bottom Bar - Sticky CTA */}
      <div className="fixed lg:hidden bottom-0 left-0 right-0 bg-white border-t border-border-primary shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-20">
        <div className="px-4 py-3">
          {/* Price Summary */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-text-muted">Total</p>
              <p className="text-xl font-bold text-primary">${total.toFixed(2)}</p>
            </div>
            {deliveryFee === 0 && fulfillmentMethod !== "pickup" && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                Free {fulfillmentMethod === "delivery" ? "Delivery" : "Shipping"}
              </span>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            {currentStepIndex > 0 && (
              <button
                onClick={prevStep}
                className="flex-shrink-0 px-4 py-3.5 border border-border-primary rounded-xl text-text-primary font-medium active:bg-bg-alt"
              >
                Back
              </button>
            )}
            
            {currentStep !== "payment" ? (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="flex-1 py-3.5 bg-primary text-white rounded-xl font-medium active:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmitOrder}
                disabled={isSubmitting}
                className="flex-1 py-3.5 bg-primary text-white rounded-xl font-medium active:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader height={18} width={18} />
                    Placing Order...
                  </>
                ) : (
                  "Place Order"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}


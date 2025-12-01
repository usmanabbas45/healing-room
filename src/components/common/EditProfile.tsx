"use client";

import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader } from "./Loader";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export default function EditProfile() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [showAddress, setShowAddress] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    province: "",
    postalCode: "",
    country: "Canada",
  });

  // Fetch full profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          setProfile({
            name: data.user.name || "",
            email: data.user.email || "",
            phone: data.user.phone || "",
            addressLine1: data.user.addressLine1 || "",
            addressLine2: data.user.addressLine2 || "",
            city: data.user.city || "",
            province: data.user.province || "",
            postalCode: data.user.postalCode || "",
            country: data.user.country || "Canada",
          });
          // Show address section if any address data exists
          if (data.user.addressLine1 || data.user.city || data.user.province) {
            setShowAddress(true);
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setIsFetching(false);
      }
    };

    if (session?.user) {
      fetchProfile();
    } else {
      setIsFetching(false);
    }
  }, [session]);

  const handleSubmit = async () => {
    if (!profile.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      const data = await response.json();

      if (response.ok) {
        // Update NextAuth session with new name
        await update({ name: profile.name });
        
        if (data.hikeupSynced) {
          toast.success("Profile updated & synced to POS!");
        } else if (data.hikeupError) {
          toast.success("Profile saved!", {
            description: "Note: POS sync failed, but your changes are saved locally.",
          });
        } else {
          toast.success("Profile updated!");
        }
      } else {
        toast.error(data.message || "Failed to update profile");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof ProfileData, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  if (isFetching) {
    return (
      <DialogContent className="sm:max-w-[500px]">
        <div className="flex items-center justify-center py-12">
          <Loader height={30} width={30} />
        </div>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogDescription>
          Update your account details. Changes will sync to our POS system.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Basic Info */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={profile.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Your name"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={profile.email}
              disabled
              className="bg-gray-50 text-text-muted"
            />
            <p className="text-xs text-text-muted">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={profile.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="(123) 456-7890"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Address Section - Collapsible */}
        <div className="border-t pt-4">
          <button
            type="button"
            onClick={() => setShowAddress(!showAddress)}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-text-primary hover:text-primary transition-colors"
          >
            <span>Saved Address (Optional)</span>
            {showAddress ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          <p className="text-xs text-text-muted mt-1">
            Save your address for faster checkout
          </p>

          {showAddress && (
            <div className="space-y-3 mt-4">
              <div className="space-y-2">
                <Label htmlFor="addressLine1">Street Address</Label>
                <Input
                  id="addressLine1"
                  value={profile.addressLine1}
                  onChange={(e) => handleChange("addressLine1", e.target.value)}
                  placeholder="123 Main St"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine2">Apt, Suite, Unit (Optional)</Label>
                <Input
                  id="addressLine2"
                  value={profile.addressLine2}
                  onChange={(e) => handleChange("addressLine2", e.target.value)}
                  placeholder="Apt 4B"
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={profile.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    placeholder="Toronto"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="province">Province</Label>
                  <select
                    id="province"
                    value={profile.province}
                    onChange={(e) => handleChange("province", e.target.value)}
                    disabled={isLoading}
                    className="w-full h-10 px-3 border border-border-primary rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select</option>
                    <option value="ON">Ontario</option>
                    <option value="BC">British Columbia</option>
                    <option value="AB">Alberta</option>
                    <option value="SK">Saskatchewan</option>
                    <option value="MB">Manitoba</option>
                    <option value="QC">Quebec</option>
                    <option value="NB">New Brunswick</option>
                    <option value="NS">Nova Scotia</option>
                    <option value="PE">Prince Edward Island</option>
                    <option value="NL">Newfoundland and Labrador</option>
                    <option value="YT">Yukon</option>
                    <option value="NT">Northwest Territories</option>
                    <option value="NU">Nunavut</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    value={profile.postalCode}
                    onChange={(e) => handleChange("postalCode", e.target.value.toUpperCase())}
                    placeholder="A1B 2C3"
                    maxLength={7}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={profile.country}
                    disabled
                    className="bg-gray-50 text-text-muted"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2 border-t">
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="bg-primary text-white px-6 py-2.5 rounded-md font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader height={18} width={18} />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
    </DialogContent>
  );
}

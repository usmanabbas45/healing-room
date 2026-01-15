"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Image from "next/image";

const Signin = () => {
  const labelStyles = "w-full text-sm text-text-primary";
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  
  // Get the callback URL from query params
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  useEffect(() => {
    if (session?.user) {
      window.location.reload();
    }
  }, [session]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const res = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false,
      });

      if (res?.error) {
        setError(res.error as string);
      }

      if (!res?.error) {
        // Redirect to callbackUrl after successful login
        return router.push(callbackUrl);
      }
    },
    [callbackUrl, router]
  );

  return (
    <section className="flex items-center justify-center w-full pt-12 xs:h-80vh">
      <form
        className="p-6 xs:p-10 w-full max-w-350 flex flex-col justify-between items-center gap-2.5	
                border border-solid border-border-primary bg-white rounded-lg shadow-sm"
        onSubmit={handleSubmit}
      >
        {/* Logo */}
        <div className="mb-4">
          <Image
            src="/logo.png"
            alt="Healing Room"
            width={60}
            height={60}
            className="h-16 w-auto"
          />
        </div>

        {error && (
          <div className="text-red-500 flex items-center justify-center gap-2 bg-red-50 px-4 py-2 rounded-md w-full">
            <svg
              data-testid="geist-icon"
              height="16"
              strokeLinejoin="round"
              viewBox="0 0 16 16"
              width="16"
              style={{ color: "currentColor" }}
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M5.30761 1.5L1.5 5.30761L1.5 10.6924L5.30761 14.5H10.6924L14.5 10.6924V5.30761L10.6924 1.5H5.30761ZM5.10051 0C4.83529 0 4.58094 0.105357 4.3934 0.292893L0.292893 4.3934C0.105357 4.58094 0 4.83529 0 5.10051V10.8995C0 11.1647 0.105357 11.4191 0.292894 11.6066L4.3934 15.7071C4.58094 15.8946 4.83529 16 5.10051 16H10.8995C11.1647 16 11.4191 15.8946 11.6066 15.7071L15.7071 11.6066C15.8946 11.4191 16 11.1647 16 10.8995V5.10051C16 4.83529 15.8946 4.58093 15.7071 4.3934L11.6066 0.292893C11.4191 0.105357 11.1647 0 10.8995 0H5.10051ZM8.75 3.75V4.5V8L8.75 8.75H7.25V8V4.5V3.75H8.75ZM8 12C8.55229 12 9 11.5523 9 11C9 10.4477 8.55229 10 8 10C7.44772 10 7 10.4477 7 11C7 11.5523 7.44772 12 8 12Z"
                fill="currentColor"
              ></path>
            </svg>
            <div className="text-sm">{error}</div>
          </div>
        )}
        <h1 className="w-full mb-3 text-2xl font-bold text-text-primary text-center">Sign In</h1>

        <label className={labelStyles}>Email:</label>
        <input
          type="email"
          placeholder="Email"
          className="w-full text-text-primary h-10 border border-solid border-border-primary py-1 px-3 rounded-md bg-bg-alt text-sm focus:outline-none focus:border-primary transition-colors"
          name="email"
        />

        <label className={labelStyles}>Password:</label>
        <div className="flex w-full">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="w-full text-text-primary h-10 border border-solid border-border-primary py-1 px-3 rounded-l-md bg-bg-alt text-sm focus:outline-none focus:border-primary transition-colors"
            name="password"
          />
          <button
            className="flex text-text-muted items-center justify-center w-12 transition duration-150 bg-bg-alt border-r border-solid rounded-r-md border-y border-border-primary ease hover:bg-border-primary hover:text-text-primary"
            onClick={(e) => {
              e.preventDefault();
              setShowPassword(!showPassword);
            }}
            type="button"
          >
            {showPassword ? (
              <svg
                data-testid="geist-icon"
                height="16"
                strokeLinejoin="round"
                viewBox="0 0 16 16"
                width="16"
                style={{ color: "currentColor" }}
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M4.02168 4.76932C6.11619 2.33698 9.88374 2.33698 11.9783 4.76932L14.7602 7.99999L11.9783 11.2307C9.88374 13.663 6.1162 13.663 4.02168 11.2307L1.23971 7.99999L4.02168 4.76932ZM13.1149 3.79054C10.422 0.663244 5.57797 0.663247 2.88503 3.79054L-0.318359 7.5106V8.48938L2.88503 12.2094C5.57797 15.3367 10.422 15.3367 13.1149 12.2094L16.3183 8.48938V7.5106L13.1149 3.79054ZM6.49997 7.99999C6.49997 7.17157 7.17154 6.49999 7.99997 6.49999C8.82839 6.49999 9.49997 7.17157 9.49997 7.99999C9.49997 8.82842 8.82839 9.49999 7.99997 9.49999C7.17154 9.49999 6.49997 8.82842 6.49997 7.99999ZM7.99997 4.99999C6.34311 4.99999 4.99997 6.34314 4.99997 7.99999C4.99997 9.65685 6.34311 11 7.99997 11C9.65682 11 11 9.65685 11 7.99999C11 6.34314 9.65682 4.99999 7.99997 4.99999Z"
                  fill="currentColor"
                ></path>
              </svg>
            ) : (
              <svg
                data-testid="geist-icon"
                height="16"
                strokeLinejoin="round"
                viewBox="0 0 16 16"
                width="16"
                style={{ color: "currentColor" }}
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M0.191137 2.06228L0.751694 2.56055L14.2517 14.5605L14.8122 15.0588L15.8088 13.9377L15.2482 13.4394L13.4399 11.832L16.3183 8.48938V7.51059L13.1149 3.79053C10.6442 0.921301 6.36413 0.684726 3.59378 3.07992L1.74824 1.43943L1.18768 0.941162L0.191137 2.06228ZM14.7602 7.99998L12.3187 10.8354L10.6699 9.36978C11.249 8.24171 11.0661 6.82347 10.1213 5.87865C9.08954 4.8469 7.49326 4.72376 6.32676 5.50923L4.72751 4.08767C6.88288 2.36327 10.1023 2.59076 11.9783 4.76931L14.7602 7.99998ZM7.52702 6.57613L9.46929 8.30259C9.56713 7.82531 9.43091 7.30959 9.06063 6.93931C8.64578 6.52446 8.0484 6.4034 7.52702 6.57613ZM-0.318359 7.51059L1.40386 5.5106L2.54051 6.48938L1.23971 7.99998L4.02168 11.2307C5.52853 12.9805 7.90301 13.4734 9.89972 12.7017L10.4405 14.1008C7.88008 15.0904 4.82516 14.4625 2.88503 12.2094L-0.318359 8.48938V7.51059Z"
                  fill="currentColor"
                ></path>
              </svg>
            )}
          </button>
        </div>
        <button
          className="w-full bg-primary text-white border border-solid border-primary py-2.5 mt-4 rounded-md transition-all hover:bg-primary-dark text-sm font-medium"
          type="submit"
        >
          Sign In
        </button>

        <div className="w-full flex items-center justify-center gap-3 mt-3">
          <Link
            href="/forgot-password"
            className="text-sm text-text-muted hover:text-primary transition-colors"
          >
            Forgot password?
          </Link>
          <span className="text-border-primary">|</span>
          <Link
            href="/register"
            className="text-sm text-text-muted hover:text-primary transition-colors"
          >
            Create account
          </Link>
        </div>
      </form>
    </section>
  );
};

export default Signin;

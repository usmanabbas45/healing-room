/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx,js,jsx}",
    "./components/**/*.{ts,tsx,js,jsx}",
    "./app/**/*.{ts,tsx,js,jsx}",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Healing Room Brand Colors
        primary: {
          DEFAULT: "#D4842A",
          dark: "#B8702A",
          light: "#E9A54D",
        },
        // Text colors
        "text-primary": "#2D2D2D",
        "text-light": "#666666",
        "text-muted": "#888888",
        // Background colors
        "bg-primary": "#FFFFFF",
        "bg-alt": "#F8F8F8",
        "bg-warm": "#FDF9F5",
        // Border colors
        "border-primary": "#E5E5E5",
        "border-dark": "#D0D0D0",
        // Legacy color mappings (for compatibility)
        "border-secondary": "#D0D0D0",
        "background-secondary": "#F8F8F8",
        "background-alert": "rgba(255, 255, 255, 0.95)",
        "color-secondary": "#F0F0F0",
        "color-tertiary": "#888888",
        999: "#888888",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      gridTemplateColumns: {
        "auto-fill-250": "repeat(auto-fill, minmax(250px, 1fr))",
        "auto-fill-350": "repeat(auto-fill, minmax(350px, 1fr))",
        "auto-fill-110": "repeat(auto-fill, minmax(110px, 1fr))",
        "auto-fill-32": "repeat(auto-fill, minmax(32px, 1fr))",
      },
      height: {
        "60vh": "60vh",
        "80vh": "80vh",
        260: "260px",
      },
      minWidth: {
        "grid-img": "560px",
        250: "250px",
      },
      maxWidth: {
        img: "850px",
        350: "350px",
        90: "90%",
        180: "180px",
      },
      flexBasis: {
        600: "600px",
        800: "800px",
      },
      translate: {
        hide: "-100%",
      },
      screens: {
        xs: "350px",
      },
      flexGrow: {
        999: "999",
      },
      inset: {
        selected: "-7px",
      },
      fontSize: {
        13: "13px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

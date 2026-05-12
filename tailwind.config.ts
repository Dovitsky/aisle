import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Off-white paper, deep ink, sage accent. Luxury minimalism.
        paper: {
          DEFAULT: "#FAFAF7",
          50:  "#FFFFFF",
          100: "#FAFAF7",
          200: "#F2F2EE",
          300: "#E8E8E2",
          400: "#D4D4CD",
        },
        ink: {
          DEFAULT: "#0E0E0C",
          50:  "#F2F2EE",
          100: "#D4D4CF",
          200: "#9A9A95",
          300: "#585855",
          400: "#2A2A28",
          500: "#0E0E0C",
        },
        // Sage — single muted accent across the whole app.
        sage: {
          DEFAULT: "#A8B5A0",
          50:  "#F1F4EE",
          100: "#E0E6DA",
          200: "#C7D1BD",
          300: "#A8B5A0",
          400: "#7A8A72",
          500: "#4F5D44",
          600: "#3A4632",
        },
        // Back-compat alias so existing class refs (text-accent, bg-accent-wash) still work.
        accent: {
          DEFAULT: "#4F5D44",
          soft: "#A8B5A0",
          wash: "#E0E6DA",
        },
        risk: {
          low: "#4F5D44",     // sage — quiet positive
          medium: "#8C7331",  // muted amber
          high: "#8E2F25",    // deep oxblood
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', "Garamond", "Georgia", "serif"],
        // Clean sans across the site. No Inter (its mono caps tracking was
        // the "AI startup" giveaway). System sans first, then Helvetica.
        sans: ["-apple-system", "BlinkMacSystemFont", '"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
        // `font-mono` is kept as a Tailwind class for legacy refs, but it
        // now resolves to the same sans stack — anywhere that used to read
        // as monospace caps now reads as the sane Helvetica register.
        mono: ["-apple-system", "BlinkMacSystemFont", '"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
      },
      maxWidth: {
        phone: "440px",
      },
      borderRadius: {
        card: "16px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 1px 0 rgba(14,14,12,0.04), 0 8px 28px -14px rgba(14,14,12,0.10)",
        cardHover: "0 1px 0 rgba(14,14,12,0.06), 0 18px 40px -16px rgba(14,14,12,0.18)",
        cta: "0 1px 0 rgba(14,14,12,0.06), 0 4px 14px -4px rgba(14,14,12,0.20)",
        // Floating dock — large, soft, lifted shadow with sage tint
        float: "0 0 0 1px rgba(14,14,12,0.06), 0 30px 60px -24px rgba(14,14,12,0.30), 0 12px 32px -16px rgba(79,93,68,0.18)",
      },
      borderWidth: {
        hairline: "1px",
      },
      opacity: {
        2: "0.02",
        3: "0.03",
        8: "0.08",
        12: "0.12",
        18: "0.18",
      },
    },
  },
  plugins: [],
};

export default config;

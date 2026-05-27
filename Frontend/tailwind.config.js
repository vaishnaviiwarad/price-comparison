/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff8e6",
          100: "#f5ddb0",
          200: "#ebca82",
          500: "#d0a24a",
          600: "#b7872d",
          700: "#8a651d",
          900: "#2f220c"
        },
        royal: {
          950: "#050813",
          900: "#0b1020",
          850: "#10172d",
          800: "#151d38",
          700: "#1d2950",
          600: "#2c3d73",
          500: "#3c5292"
        },
        ink: {
          900: "#f7f8ff",
          800: "#d8def4",
          700: "#a7b2d5",
          600: "#7c88ad",
          500: "#5d6788"
        },
        sand: "#111829",
        coral: "#f08a72",
        gold: "#d0a24a"
      },
      boxShadow: {
        glow: "0 24px 70px rgba(3, 8, 24, 0.55)",
        halo:
          "0 0 0 1px rgba(255,255,255,0.06), 0 24px 60px rgba(3, 8, 24, 0.6), inset 0 1px 0 rgba(255,255,255,0.04)"
      },
      backgroundImage: {
        hero:
          "radial-gradient(circle at 12% 18%, rgba(208, 162, 74, 0.16), transparent 22%), radial-gradient(circle at 88% 14%, rgba(60, 82, 146, 0.28), transparent 24%), radial-gradient(circle at 58% 100%, rgba(208, 162, 74, 0.12), transparent 30%), linear-gradient(135deg, #050813 0%, #0b1020 40%, #121b34 100%)"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -12px, 0)" }
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(16px, -14px, 0) scale(1.05)" }
        },
        reveal: {
          "0%": { opacity: "0", transform: "translate3d(0, 18px, 0)" },
          "100%": { opacity: "1", transform: "translate3d(0, 0, 0)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" }
        }
      },
      animation: {
        "float-slow": "float 9s ease-in-out infinite",
        drift: "drift 16s ease-in-out infinite",
        reveal: "reveal 700ms cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 8s linear infinite"
      }
    }
  },
  plugins: []
};

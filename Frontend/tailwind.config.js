/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefbf3",
          100: "#d4f5df",
          500: "#0f9f55",
          600: "#0b7f43",
          900: "#072917"
        },
        ink: {
          900: "#101828",
          800: "#1d2939",
          700: "#344054"
        },
        sand: "#f9f5ef",
        coral: "#f9735b",
        gold: "#f4b942"
      },
      boxShadow: {
        glow: "0 20px 45px rgba(15, 159, 85, 0.15)"
      },
      backgroundImage: {
        hero:
          "radial-gradient(circle at top left, rgba(244, 185, 66, 0.25), transparent 28%), radial-gradient(circle at top right, rgba(15, 159, 85, 0.2), transparent 32%), linear-gradient(135deg, #fffdf7 0%, #f4efe5 100%)"
      }
    }
  },
  plugins: []
};

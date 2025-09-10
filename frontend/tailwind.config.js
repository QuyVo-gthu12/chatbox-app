/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#7c3aed",
        secondary: "#d946ef",
        messageOwn: "#4f46e5",
        messageOther: "#eeeeeeff",
        messageOtherDark: "#374151",
      },
      backgroundImage: {
        background: "linear-gradient(to right, #000000, #002307)", // ✅ Gradient đen → xanh biển đậm
        "dark-background": "linear-gradient(to right, #000000, #002307)", // ✅ dark cũng giống nhau
      },
      boxShadow: {
        neon: "0 0 10px rgba(124, 58, 237, 0.5), 0 0 20px rgba(217, 70, 239, 0.5)",
      },
      animation: {
        "gradient-x": "gradient-x 15s ease infinite",
        pulse: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fade-in 0.5s ease-out",
        "scale-up": "scale-up 0.3s ease-out",
      },
      keyframes: {
        "gradient-x": {
          "0%, 100%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" },
        },
        pulse: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.5 },
        },
        "fade-in": {
          from: { opacity: 0, transform: "translateY(20px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "scale-up": {
          from: { transform: "scale(0.95)" },
          to: { transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

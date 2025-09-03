/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#7c3aed", // Violet đậm hơn, ánh tím nhẹ
        secondary: "#d946ef", // Fuchsia nhạt hơn
        messageOwn: "#4f46e5", // Blue for own messages
        messageOther: "#eeeeeeff", // Gray for others' messages (light mode)
        messageOtherDark: "#374151", // Darker gray for others' messages (dark mode)
      },
      backgroundImage: {
        background: "linear-gradient(to right, #c1cbffff, #d946ef)", // Gradient tím-hồng nhạt hơn
        "dark-background": "linear-gradient(to right, #2a1a5e, #6b127c)", // Gradient tối hơn, ánh tím
      },
      boxShadow: {
        neon: "0 0 10px rgba(124, 58, 237, 0.5), 0 0 20px rgba(217, 70, 239, 0.5)", // Neon tím
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
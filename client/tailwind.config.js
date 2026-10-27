/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FAF7F2', // Warm ivory
        main: '#292720',       // Deep charcoal-brown
        primary: {
          DEFAULT: '#A95032',  // Deep terracotta (contrast passes with white text)
          hover: '#8F4228',    // Primary hover
          light: '#C96B45',    // Warm terracotta orange (large headings & decoration only)
        },
        accent: {
          sage: '#A8B59A',     // Muted sage green
          blush: '#F3DCD5',    // Soft blush pink
        },
        success: '#28784A',    // Accessible green
        warning: '#946200',    // Dark amber
        error: '#B42332',      // Deep muted red
        card: '#FFFFFF',       // Card background
        border: '#E8E0D6',     // Border tone
        muted: '#6B675F',      // Muted text (5.27:1 on ivory)
        admin: {
          bg: '#F4F5F6',       // Admin background
          accent: '#355C4A',   // Admin forest-green accent
        },
      },
      fontFamily: {
        heading: ['Nunito', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'card': '18px',
        'card-lg': '22px',
        'card-sm': '16px',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(41, 39, 32, 0.05)',
        'soft-hover': '0 10px 25px -3px rgba(41, 39, 32, 0.1)',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-navy': '#1E2761',
        'brand-teal': '#0891B2',
        'brand-ice': '#CADCFC',
      },
    },
  },
  plugins: [],
}

// Tailwind v4 runs through PostCSS for both `next dev` (Turbopack) and `next build --webpack`.
// Without this file the webpack production build shipped CSS with no Tailwind utilities.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;

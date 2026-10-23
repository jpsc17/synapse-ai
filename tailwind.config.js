/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "background": "#080D18",
        "surface-base": "#051424",
        "surface-dim": "#051424",
        "surface-container-lowest": "#010F1F",
        "surface-container-low": "#0D1C2D",
        "surface-container": "#122131",
        "surface-container-high": "#1C2B3C",
        "surface-container-highest": "#273647",
        "surface-bright": "#2C3A4C",
        "surface-variant": "#273647",
        "on-surface": "#D4E4FA",
        "on-surface-variant": "#94A3B8",
        "on-background": "#D4E4FA",
        "outline": "#84948F",
        "outline-variant": "#253247",
        
        // Brand & Accents
        "primary": "#27E0C3", // Electric Teal
        "primary-glow": "#55FDDF",
        "primary-container": "#27E0C3",
        "on-primary": "#00382F",
        "on-primary-container": "#005F51",
        "primary-fixed": "#53FBDD",
        "primary-fixed-dim": "#23DEC1",
        "on-primary-fixed": "#00201A",

        "secondary": "#718BFF", // Electric Indigo
        "secondary-container": "#193AAD",
        "on-secondary": "#002388",
        "on-secondary-container": "#A1B1FF",
        "secondary-fixed": "#DDE1FF",
        "secondary-fixed-dim": "#B8C3FF",

        "tertiary": "#D9E4FE",
        "tertiary-container": "#172235",
        "on-tertiary": "#263144",
        "on-tertiary-container": "#495469",

        "error": "#EF4444",
        "error-container": "#93000A",
        "on-error": "#690005",
        "on-error-container": "#FFDAD6",
        
        "success": "#22C55E",
        "warning": "#F59E0B"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "Segoe UI", "sans-serif"],
        "body-default": ["Inter", "ui-sans-serif", "Segoe UI", "sans-serif"],
        "headline-sm": ["Inter", "ui-sans-serif", "Segoe UI", "sans-serif"],
        "headline-md": ["Inter", "ui-sans-serif", "Segoe UI", "sans-serif"],
        "display-lg": ["Inter", "ui-sans-serif", "Segoe UI", "sans-serif"],
        "code-compact": ["Cascadia Mono", "Consolas", "monospace"],
        "code-base": ["Cascadia Mono", "Consolas", "monospace"],
        mono: ["Cascadia Mono", "Consolas", "monospace"]
      },
      spacing: {
        "gutter": "1rem",
        "gutter-mobile": "0.75rem",
        "margin": "1.5rem",
        "margin-mobile": "1rem",
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "0.75rem",
        "space-lg": "1.25rem",
        "space-xl": "2rem",
      },
      boxShadow: {
        "teal-glow": "0 0 16px -2px rgba(39, 224, 195, 0.35)",
        "indigo-glow": "0 0 16px -2px rgba(113, 139, 255, 0.35)",
        "card-subtle": "0 8px 24px -4px rgba(1, 15, 31, 0.5)",
      }
    },
  },
  plugins: [],
};

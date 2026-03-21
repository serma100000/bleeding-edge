/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // CHRONOS Design System - Scientific/Medical palette
        chronos: {
          // Primary - Deep Indigo (trust, science)
          primary: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81', 950: '#1e1b4b' },
          // Accent - Cyan/Teal (biotech, health)
          accent: { 50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63', 950: '#083344' },
          // Age states
          younger: { DEFAULT: '#10b981', light: '#6ee7b7', dark: '#059669' },
          ontrack: { DEFAULT: '#f59e0b', light: '#fcd34d', dark: '#d97706' },
          accelerated: { DEFAULT: '#ef4444', light: '#fca5a5', dark: '#dc2626' },
          // ZK Proof verified
          verified: { DEFAULT: '#8b5cf6', light: '#c4b5fd', gold: '#f59e0b' },
        },
        // Dark mode surface colors
        surface: { 0: '#0a0a0f', 1: '#111118', 2: '#1a1a24', 3: '#232330', 4: '#2d2d3d' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'stage-active': 'stageActive 1.5s ease-in-out infinite',
        'proof-verify': 'proofVerify 2.5s ease-out forwards',
      },
      keyframes: {
        stageActive: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.1)', opacity: '0.8' },
        },
        proofVerify: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '40%': { transform: 'scale(1.1)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

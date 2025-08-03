/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'mono': ['Space Mono', 'Courier New', 'monospace'],
        'pixel': ['Press Start 2P', 'monospace']
      },
      colors: {
        'terminal': {
          bg: '#0a0e1a',
          primary: '#00ff41',
          secondary: '#00d4aa',
          warning: '#ffb86c',
          error: '#ff5555',
          text: '#f8f8f2'
        },
        'pixel': {
          dark: '#2d1b69',
          purple: '#8b5cf6',
          cyan: '#06b6d4',
          green: '#10b981'
        }
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'type': 'type 3.5s steps(40, end)',
      },
      keyframes: {
        glow: {
          'from': { textShadow: '0 0 20px #00ff41' },
          'to': { textShadow: '0 0 30px #00ff41, 0 0 40px #00ff41' }
        },
        type: {
          '0%': { width: '0' },
          '100%': { width: '100%' }
        }
      }
    },
  },
  plugins: [],
} 
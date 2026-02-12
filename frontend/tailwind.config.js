import animate from "tailwindcss-animate";



/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1', // Indigo 500
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                    950: '#1e1b4b',
                },
                dark: {
                    bg: '#1a1a2e',      // Deep dark background
                    sidebar: '#16213e',  // Sidebar background
                    panel: '#1f1f3a',    // Panel background
                    card: '#252545',     // Card background
                    border: 'rgba(255, 255, 255, 0.08)',
                },
                accent: {
                    blue: '#4d7cfe',
                    green: '#27ae60',
                    yellow: '#f1c40f',
                    red: '#e74c3c',
                    cyan: '#00d2ff',
                    purple: '#9b59b6',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1)',
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
                'glow': '0 0 20px rgba(77, 124, 254, 0.15)',
            }
        },
    },
    plugins: [animate],
}

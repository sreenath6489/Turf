/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                turfGreen: '#22c55e', // Professional grass green
                darkGlass: 'rgba(255, 255, 255, 0.1)',
            }
        },
    },
    plugins: [],
}
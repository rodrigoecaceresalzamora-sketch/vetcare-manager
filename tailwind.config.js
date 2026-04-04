/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                vet: {
                    pink: '#c8799f',
                    rose: '#c8799f',
                    dark: '#000000',
                    light: '#ffffff',
                    amber: '#e8a020',
                    bone: '#fdf2f7', /* Fondo rosado pastel para el panel derecho */
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                serif: ['Georgia', 'serif'],
            }
        }
    },
    plugins: [],
}

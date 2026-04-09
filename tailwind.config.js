/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                vet: {
                    pink: 'var(--vet-pink)',
                    rose: 'var(--vet-rose)',
                    dark: 'var(--vet-dark)',
                    light: 'var(--vet-light)',
                    amber: 'var(--vet-amber)',
                    bone: 'var(--vet-bone)',
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

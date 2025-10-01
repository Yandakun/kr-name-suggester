import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'kpop-pink': '#ff69b4',
        'kpop-purple': '#8A2BE2',
        'kpop-blue': '#1E90FF',
        'kpop-silver': '#C0C0C0',
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config


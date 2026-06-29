
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        softius: {
          light: '#1587F0',
          dark: '#1E4E7A',
        },
      },
      backgroundImage: {
        'softius-gradient': 'linear-gradient(135deg, #1587F0 0%, #1E4E7A 100%)',
      },
    },
  },
  plugins: [],
};

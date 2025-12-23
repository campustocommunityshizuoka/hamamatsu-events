/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},  // ← ★ここを変更しました
    autoprefixer: {},
  },
};

export default config;
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./electron/**/*.ts",
    "./src/**/*.{js,ts,vue,jsx,tsx}",
    "./node_modules/flowbite/**/*.js",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("flowbite/plugin")],
};

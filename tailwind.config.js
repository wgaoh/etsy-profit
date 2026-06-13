// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // 模式 1: 如果你的 HTML 在项目根目录，就像你的 index.html
    './*.html',
    // 模式 2: 如果你的文件都在 src/ 目录下（最通用）
    './src/**/*.{html,js}',
    // 模式 3: 如果你的文件结构很复杂，或者你也不知道具体位置，这个模式最宽泛，但最有效（注意性能）
    // './**/*.{html,js}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
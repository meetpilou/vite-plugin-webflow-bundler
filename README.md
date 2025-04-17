# 🚀 vite-plugin-webflow-bundler

A Vite plugin that compiles and bundles your **JavaScript** and **CSS** files for seamless integration with **Webflow**, optimized for:

- Local development (`localhost`)
- Production delivery via GitHub CDN (jsDelivr)

---

## ✨ Features

- ⚡ Automatically generates **CSS and JS loaders** for Webflow
- 🔄 Watches for changes and rebundles into `dist/`
- 📦 Creates a `manifest.json` for CDN version tracking
- 🧪 Local interface at `http://localhost:3000/webflow`
- 🧠 Smart fallback logic: localhost → CDN
- 🧹 Automatic minification (individual files + CSS bundle)
- 📐 **Precise control of CSS order with `cssOrder`**

---

## 📦 Installation

```bash
npm install --save-dev @kobonostudio/vite-plugin-webflow-bundler
```

---

## ⚙️ Basic Setup

### 1. Add the plugin to `vite.config.js`

```js
import { defineConfig } from 'vite'
import webflowBundlerPlugin from '@kobonostudio/vite-plugin-webflow-bundler'

export default defineConfig({
  plugins: [webflowBundlerPlugin()],
})
```

### 2. Create a `starter.config.js` file

```js
export default {
  cdn: {
    baseUrl: 'https://cdn.jsdelivr.net/gh',
    user: 'your-github-user',
    repo: 'your-repo-name',
    branch: 'main',
    org: true, // or false for personal accounts
  },

  deploy: {
    mode: 'split', // 'none' | 'public-only' | 'split'
    publicRepo: 'my-webflow-project-prod',
    privateRepo: 'my-webflow-project',
    branch: 'main',
  },

  // (optional) custom order for CSS files
  cssOrder: [
    'reset.css',
    'variables.css',
    'layout.css',
    'components/button.css',
    'styles.css',
  ],
}
```

---

## 📁 Recommended Structure

```bash
your-project/
├── src/
│   ├── css/
│   │   ├── reset.css
│   │   ├── variables.css
│   │   ├── layout.css
│   │   └── styles.css
│   └── main.js
├── index.html
├── vite.config.js
├── starter.config.js
└── ...
```

---

## 🧪 Local Development

```bash
npm run dev
```

Then open:

```bash
http://localhost:3000/webflow
```

You’ll get:

- ✅ CSS & JS loaders automatically generated
- 📋 Copy-paste buttons for Webflow custom code
- 🔁 Automatic fallback between `localhost` and `jsDelivr`

---

## 🚀 Production Build

```bash
npm run build
```

This will:

- 🔧 Minify and copy CSS and JS files into `dist/`
- 📦 Generate a `manifest.json`
- 🧠 Inject loader snippets into `dist/index.html`

---

## 🔎 Output Structure

```bash
dist/
├── css/
│   ├── reset.min.css
│   ├── variables.min.css
│   ├── ...
│   └── bundle.min.css
├── scripts/
│   └── main.min.js
├── manifest.json
└── index.html (with injected loaders)
```

---

## 🧠 How It Works

1. Tries to load assets from `localhost`
2. If that fails (e.g. in Webflow), it falls back to GitHub CDN (via jsDelivr)

---

## 🎯 Bonus: CSS Order Control

You can enforce the order of your CSS files in the bundle using the `cssOrder` option:

```js
cssOrder: ['reset.css', 'typography.css', 'styles.css']
```

Useful to avoid renaming or manually importing in your files.

---

## 🧠 Author

Made with ❤️ by [Pierre Lovenfosse](https://github.com/meetpilou)

## 📄 License

MIT — © Pierre Lovenfosse

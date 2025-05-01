import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function getCdnBase(config) {
  return `${config?.cdn?.baseUrl || ''}/${config?.cdn?.user || ''}/${
    config?.cdn?.repo || ''
  }@${config?.cdn?.branch || 'main'}`
}

function escapeHtml(str) {
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function minifyCss(raw) {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .trim()
}

function minifyJs(js) {
  return js
    .replace(/\n/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*([{}();,:])\s*/g, '$1')
    .trim()
}

function writeFileSafe(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content, 'utf-8')
}

async function loadUserConfig() {
  const configPath = path.resolve(process.cwd(), 'starter.config.js')
  if (fs.existsSync(configPath)) {
    try {
      const config = await import(configPath)
      return config.default || config
    } catch (e) {
      console.warn(
        '[vite-plugin-webflow-bundler] Error loading starter.config.js:',
        e
      )
    }
  } else {
    console.warn('[vite-plugin-webflow-bundler] No starter.config.js found.')
  }
  return {}
}

function generateCssLoaders(config) {
  const cssDir = path.resolve(process.cwd(), 'src/css')
  if (!fs.existsSync(cssDir)) return []
  return fs
    .readdirSync(cssDir)
    .filter((f) => f.endsWith('.css'))
    .map((f) => {
      const base = f.replace('.css', '')
      const local = `http://localhost:3000/src/css/${f}`
      const cdn = `${getCdnBase(config)}/css/${base}.min.css`
      const code = `<script defer type="text/javascript">document.addEventListener("DOMContentLoaded",function(){
        const link=document.createElement("link");
        link.rel="stylesheet";
        fetch("${local}",{method:"HEAD"})
          .then(()=>link.href="${local}")
          .catch(()=>link.href="${cdn}");
        document.head.appendChild(link);
      })</script>`
      return { name: base, code: minifyJs(code) }
    })
}

function generateJsLoaders(config) {
  const files = []

  // Inclure le main.js
  const mainPath = path.resolve(process.cwd(), 'src/main.js')
  if (fs.existsSync(mainPath)) {
    files.push({ name: 'main', file: 'main.js', path: mainPath })
  }

  // Inclure les fichiers dans src/pages
  const pagesDir = path.resolve(process.cwd(), 'src/pages')
  if (fs.existsSync(pagesDir)) {
    const pageFiles = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.js'))
    for (const f of pageFiles) {
      files.push({
        name: f.replace('.js', ''),
        file: f,
        path: path.join(pagesDir, f),
      })
    }
  }

  return files.map(({ name, file }) => {
    const local = `http://localhost:3000/${
      file === 'main.js' ? 'src' : 'src/pages'
    }/${file}`
    const cdn = `${getCdnBase(config)}/scripts/${
      file === 'main.js' ? '' : 'pages/'
    }${name}.js`
    const code = `<script defer type="text/javascript">document.addEventListener("DOMContentLoaded",function(){
      const s=document.createElement("script");
      s.type="module";
      fetch("${local}",{method:"HEAD"})
        .then(()=>s.src="${local}")
        .catch(()=>s.src="${cdn}");
      document.body.appendChild(s);
    })</script>`
    return { name, code: minifyJs(code) }
  })
}

function generateExtraHtmlBlocks(loaders, type) {
  return loaders
    .map(({ name, code }) => {
      return `<div class="code">
        <div class="code__content">
          <pre class=""
            contenteditable="false"><h2 class="code__title">${name}.${type}</h2><code class="language-html" id="${type}-${name}">${escapeHtml(
        code
      )}</code></pre>
        </div>
        <div class="code__actions">
          <button type="button">📋 Copy ${name}.${type}</button>
        </div>
      </div>`
    })
    .join('')
}

export default function webflowBundlerPlugin() {
  return {
    name: 'vite-plugin-webflow-bundler',

    async generateBundle() {
      const config = await loadUserConfig()
      const cssDir = path.resolve(process.cwd(), 'src/css')
      const distCssDir = path.resolve(process.cwd(), 'dist/css')
      let cssFiles = []

      if (fs.existsSync(cssDir)) {
        if (Array.isArray(config.cssOrder) && config.cssOrder.length > 0) {
          cssFiles = config.cssOrder.filter((f) =>
            fs.existsSync(path.join(cssDir, f))
          )
        } else {
          cssFiles = fs.readdirSync(cssDir).filter((f) => f.endsWith('.css'))
        }
      }

      const allCss = []
      const manifest = {
        version: null,
        files: {
          cssMin: [],
          jsMin: [],
        },
      }

      for (const file of cssFiles) {
        const base = path.basename(file, '.css')
        const raw = fs.readFileSync(path.join(cssDir, file), 'utf-8')
        const minified = minifyCss(raw)
        writeFileSafe(path.join(distCssDir, `${base}.min.css`), minified)
        allCss.push(minified)
        manifest.files.cssMin.push(`css/${base}.min.css`)
      }

      const jsLoaders = generateJsLoaders(config)
      manifest.files.jsMin = jsLoaders.map((loader) => {
        const base = loader.name === 'main' ? '' : 'pages/'
        return `scripts/${base}${loader.name}.js`
      })

      writeFileSafe(
        path.join(process.cwd(), 'dist/manifest.json'),
        JSON.stringify(manifest, null, 2)
      )

      console.log('✅ CSS minified')
    },

    async configureServer(server) {
      const open = (await import('open')).default
      const config = await loadUserConfig()
      const htmlTemplatePath = path.resolve(__dirname, 'webflow-page.html')

      server.middlewares.use('/webflow', (_, res) => {
        const cssLoaders = generateCssLoaders(config)
        const jsLoaders = generateJsLoaders(config)

        const html = fs
          .readFileSync(htmlTemplatePath, 'utf-8')
          .replace('__CSS_BLOCKS__', generateExtraHtmlBlocks(cssLoaders, 'css'))

          .replace('__JS_BLOCKS__', generateExtraHtmlBlocks(jsLoaders, 'js'))
        res.setHeader('Content-Type', 'text/html')
        res.end(html)
      })
      server.httpServer?.once('listening', () =>
        setTimeout(() => open('http://localhost:3000/webflow'), 500)
      )
    },
  }
}

#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const markdownPath = path.join(repoRoot, 'AI1220_system_design_document.md')
const outDir = path.join(repoRoot, 'dist')
const htmlPath = path.join(outDir, 'AI1220_system_design_document.html')
const pdfPath = path.join(outDir, 'AI1220_system_design_document.pdf')

const chromeCandidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
]

function commandExists(command) {
  try {
    execFileSync('which', [command], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function getChromeBinary() {
  for (const candidate of chromeCandidates) {
    try {
      readFileSync(candidate)
      return candidate
    } catch {
      continue
    }
  }

  throw new Error(
    'Google Chrome was not found. Install Chrome or update scripts/build-ai1220-pdf.mjs with the correct binary path.',
  )
}

if (!commandExists('pandoc')) {
  throw new Error('pandoc is required to build the AI1220 PDF.')
}

mkdirSync(outDir, { recursive: true })

execFileSync(
  'pandoc',
  [
    markdownPath,
    '--from=gfm',
    '--to=html5',
    '--standalone',
    '--metadata',
    'title=AI1220 System Design Document',
    '--output',
    htmlPath,
  ],
  {
    cwd: repoRoot,
    stdio: 'inherit',
  },
)

const rawHtml = readFileSync(htmlPath, 'utf8')

const stylesheet = `
  :root {
    color-scheme: light;
    --page-bg: #f7f1e4;
    --panel-bg: #fffaf0;
    --ink: #241f1a;
    --muted: #63584c;
    --rule: #d8ccb9;
    --accent: #8f7e67;
    --code-bg: #f2ebdc;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: Georgia, "Times New Roman", serif;
    color: var(--ink);
    background: var(--page-bg);
    line-height: 1.6;
  }

  main, body > div {
    max-width: 1024px;
    margin: 0 auto;
    padding: 44px 48px 56px;
  }

  h1, h2, h3, h4 {
    color: var(--ink);
    line-height: 1.2;
    margin: 1.35em 0 0.5em;
    page-break-after: avoid;
  }

  h1 {
    font-size: 2.1rem;
    border-bottom: 2px solid var(--rule);
    padding-bottom: 0.35rem;
  }

  h2 {
    font-size: 1.5rem;
    border-bottom: 1px solid var(--rule);
    padding-bottom: 0.2rem;
  }

  h3 {
    font-size: 1.15rem;
  }

  p, li {
    font-size: 0.98rem;
  }

  a {
    color: #5e5a86;
    text-decoration: none;
  }

  pre, code {
    font-family: "SFMono-Regular", Menlo, Consolas, monospace;
  }

  pre {
    background: var(--code-bg);
    border: 1px solid var(--rule);
    border-radius: 12px;
    padding: 14px 16px;
    overflow: auto;
  }

  code {
    background: rgba(143, 126, 103, 0.12);
    border-radius: 6px;
    padding: 0.1rem 0.3rem;
  }

  pre code {
    background: transparent;
    padding: 0;
  }

  blockquote {
    margin: 1rem 0;
    padding: 0.75rem 1rem;
    border-left: 4px solid var(--accent);
    background: rgba(255, 250, 240, 0.7);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0 1.4rem;
    page-break-inside: avoid;
  }

  th, td {
    border: 1px solid var(--rule);
    padding: 0.65rem 0.75rem;
    text-align: left;
    vertical-align: top;
  }

  th {
    background: #efe5d2;
  }

  hr {
    border: 0;
    border-top: 1px solid var(--rule);
    margin: 2rem 0;
  }

  ul, ol {
    padding-left: 1.4rem;
  }

  img, svg {
    max-width: 100%;
  }

  .mermaid {
    display: block;
    margin: 1rem auto 1.5rem;
    padding: 16px;
    background: var(--panel-bg);
    border: 1px solid var(--rule);
    border-radius: 16px;
    page-break-inside: avoid;
  }

  .mermaid svg {
    height: auto;
  }

  .page-break {
    page-break-before: always;
  }

  @page {
    size: A4;
    margin: 16mm 14mm 16mm;
  }
`

const bootstrap = `
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs'

  const blocks = [...document.querySelectorAll('pre > code.language-mermaid')]
  for (const block of blocks) {
    const container = document.createElement('div')
    container.className = 'mermaid'
    container.textContent = block.textContent
    const pre = block.parentElement
    pre.replaceWith(container)
  }

  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
      primaryColor: '#fffaf0',
      primaryBorderColor: '#8f7e67',
      primaryTextColor: '#241f1a',
      lineColor: '#6f614e',
      secondaryColor: '#efe5d2',
      tertiaryColor: '#f7f1e4',
      background: '#fffaf0',
      mainBkg: '#fffaf0',
      nodeBorder: '#8f7e67',
      clusterBkg: '#f7f1e4',
      clusterBorder: '#b29d82',
      fontFamily: 'Georgia, "Times New Roman", serif',
    },
    flowchart: {
      curve: 'basis',
      htmlLabels: true,
    },
    sequence: {
      mirrorActors: false,
    },
  })

  await mermaid.run({
    nodes: document.querySelectorAll('.mermaid'),
  })

  document.body.dataset.mermaidReady = 'true'
  document.title = 'AI1220 System Design Document'
  console.log('mermaid-ready')
</script>
`

const preparedHtml = rawHtml
  .replace('</head>', `<style>${stylesheet}</style></head>`)
  .replace('</body>', `${bootstrap}</body>`)

writeFileSync(htmlPath, preparedHtml)

const chromeBinary = getChromeBinary()

execFileSync(
  chromeBinary,
  [
    '--headless=new',
    '--disable-gpu',
    '--allow-file-access-from-files',
    '--enable-logging=stderr',
    '--disable-crash-reporter',
    '--virtual-time-budget=15000',
    `--print-to-pdf=${pdfPath}`,
    '--no-pdf-header-footer',
    htmlPath,
  ],
  {
    cwd: repoRoot,
    stdio: 'inherit',
  },
)

console.log(`Built ${pdfPath}`)

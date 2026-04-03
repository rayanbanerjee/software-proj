#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const diagramsDir = path.join(repoRoot, 'docs', 'diagrams')
const outputDir = path.join(diagramsDir, 'generated')
const tempDir = path.join(os.tmpdir(), 'ai1220-mermaid-render')

const chromeCandidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
]

const diagrams = [
  {
    name: 'ai1220-system-context',
    width: 1500,
    height: 900,
  },
  {
    name: 'ai1220-container-view',
    width: 1800,
    height: 1100,
  },
  {
    name: 'ai1220-ai-component-view',
    width: 1400,
    height: 900,
  },
  {
    name: 'ai1220-open-shared-document-sequence',
    width: 1800,
    height: 1200,
  },
  {
    name: 'ai1220-entity-relationship',
    width: 1700,
    height: 1300,
  },
]

function getChromeBinary() {
  for (const candidate of chromeCandidates) {
    try {
      readFileSync(candidate)
      return candidate
    } catch {
      continue
    }
  }

  throw new Error('Google Chrome was not found for Mermaid diagram rendering.')
}

mkdirSync(outputDir, { recursive: true })
mkdirSync(tempDir, { recursive: true })

const chromeBinary = getChromeBinary()

for (const diagram of diagrams) {
  const sourcePath = path.join(diagramsDir, `${diagram.name}.mmd`)
  const htmlPath = path.join(tempDir, `${diagram.name}.html`)
  const outputPath = path.join(outputDir, `${diagram.name}.png`)
  const mermaidSource = readFileSync(sourcePath, 'utf8').trim()

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${diagram.name}</title>
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
      }

      body {
        width: ${diagram.width}px;
        min-height: ${diagram.height}px;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 24px;
        box-sizing: border-box;
      }

      .mermaid {
        width: 100%;
        background: #ffffff;
        border: 1px solid #d9d9d9;
        border-radius: 16px;
        padding: 18px;
        box-sizing: border-box;
      }

      .mermaid svg {
        max-width: 100%;
        height: auto;
      }
    </style>
  </head>
  <body>
    <div class="mermaid">${mermaidSource}</div>
    <script type="module">
      import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs'

      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
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
          fontFamily: 'Georgia, Times New Roman, serif',
        },
        flowchart: {
          curve: 'basis',
          htmlLabels: true,
        },
      })

      try {
        await mermaid.run({ nodes: document.querySelectorAll('.mermaid') })
        document.body.dataset.renderStatus = 'ready'
        console.log('mermaid-ready')
      } catch (error) {
        document.body.dataset.renderStatus = 'failed'
        document.body.dataset.renderMessage = String(error)
        console.error(error)
      }
    </script>
  </body>
</html>`

  writeFileSync(htmlPath, html)

  execFileSync(
    chromeBinary,
    [
      '--headless=new',
      '--disable-gpu',
      '--allow-file-access-from-files',
      '--disable-crash-reporter',
      '--hide-scrollbars',
      '--default-background-color=0xFFFFFF',
      `--window-size=${diagram.width},${diagram.height}`,
      '--virtual-time-budget=12000',
      `--screenshot=${outputPath}`,
      htmlPath,
    ],
    {
      cwd: repoRoot,
      stdio: 'inherit',
    },
  )

  console.log(`Rendered ${outputPath}`)
}

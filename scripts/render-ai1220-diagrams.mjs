#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const diagramsDir = path.join(repoRoot, "docs", "diagrams");
const outputDir = path.join(diagramsDir, "generated");
const tempDir = path.join(os.tmpdir(), "ai1220-mermaid-render");

const diagrams = [
  {
    name: "ai1220-system-context",
    width: 1600,
    height: 900,
  },
  {
    name: "ai1220-container-view",
    width: 1800,
    height: 900,
  },
  {
    name: "ai1220-container-async-view",
    width: 1800,
    height: 900,
  },
  {
    name: "ai1220-ai-component-view",
    width: 1700,
    height: 900,
  },
  {
    name: "ai1220-open-shared-document-sequence",
    width: 2200,
    height: 1400,
  },
  {
    name: "ai1220-entity-relationship",
    width: 2100,
    height: 1500,
  },
];

mkdirSync(outputDir, { recursive: true });
mkdirSync(tempDir, { recursive: true });

const mermaidConfigPath = path.join(tempDir, "mermaid-config.json");
const puppeteerConfigPath = path.join(tempDir, "puppeteer-config.json");

writeFileSync(
  mermaidConfigPath,
  JSON.stringify(
    {
      theme: "neutral",
      look: "classic",
      fontFamily: "Arial, Helvetica, sans-serif",
      flowchart: {
        curve: "linear",
        htmlLabels: false,
        nodeSpacing: 40,
        rankSpacing: 55,
        padding: 12,
      },
      sequence: {
        diagramMarginX: 40,
        diagramMarginY: 20,
        actorMargin: 50,
        width: 180,
        height: 65,
        boxMargin: 12,
        noteMargin: 12,
        messageMargin: 28,
        mirrorActors: false,
        wrap: true,
      },
      er: {
        layoutDirection: "TB",
        minEntityWidth: 180,
        minEntityHeight: 70,
        entityPadding: 14,
        stroke: "#333333",
        fill: "#ffffff",
        fontSize: 14,
      },
      themeVariables: {
        background: "#ffffff",
        primaryColor: "#ffffff",
        primaryBorderColor: "#333333",
        primaryTextColor: "#111111",
        secondaryColor: "#f7f7f7",
        tertiaryColor: "#ffffff",
        lineColor: "#4a4a4a",
        actorBorder: "#333333",
        actorBkg: "#ffffff",
        actorTextColor: "#111111",
        labelBoxBkgColor: "#ffffff",
        labelBoxBorderColor: "#333333",
        labelTextColor: "#111111",
        noteBkgColor: "#ffffff",
        noteBorderColor: "#666666",
        noteTextColor: "#111111",
        mainBkg: "#ffffff",
        nodeBorder: "#333333",
        clusterBkg: "#ffffff",
        clusterBorder: "#666666",
        edgeLabelBackground: "#ffffff",
      },
    },
    null,
    2,
  ),
);

writeFileSync(
  puppeteerConfigPath,
  JSON.stringify(
    {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
    null,
    2,
  ),
);

for (const diagram of diagrams) {
  const sourcePath = path.join(diagramsDir, `${diagram.name}.mmd`);
  const outputPath = path.join(outputDir, `${diagram.name}.png`);

  execFileSync(
    path.join(repoRoot, "node_modules", ".bin", "mmdc"),
    [
      "--input",
      sourcePath,
      "--output",
      outputPath,
      "--outputFormat",
      "png",
      "--backgroundColor",
      "white",
      "--theme",
      "neutral",
      "--width",
      String(diagram.width),
      "--height",
      String(diagram.height),
      "--scale",
      "2",
      "--configFile",
      mermaidConfigPath,
      "--puppeteerConfigFile",
      puppeteerConfigPath,
      "--quiet",
    ],
    {
      cwd: repoRoot,
      stdio: "inherit",
    },
  );

  console.log(`Rendered ${outputPath}`);
}

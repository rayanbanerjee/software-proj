import { readFileSync, writeFileSync } from "node:fs";

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  return lines.map((line) => {
    const cells = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        cells.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    cells.push(current);
    return cells;
  });
}

function toCsv(rows) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "");
          if (/[",\n]/.test(value)) {
            return `"${value.replace(/"/g, '""')}"`;
          }

          return value;
        })
        .join(",")
    )
    .join("\n");
}

const source = readFileSync("docs/process/notion-backlog.csv", "utf8");
const rows = parseCsv(source);
const [header, ...dataRows] = rows;

const index = Object.fromEntries(header.map((name, position) => [name, position]));
const statusMap = {
  Backlog: "Not started",
  Ready: "Not started",
  "In Progress": "In progress",
  Blocked: "Blocked",
  Done: "Done"
};

const outputRows = [["task", "description", "dept", "status", "assigned to"]];

for (const row of dataRows) {
  const taskId = row[index["Task ID"]];
  const title = row[index["Title"]];
  const area = row[index["Area"]];
  const status = statusMap[row[index["Status"]]] ?? row[index["Status"]] ?? "Not started";
  const owner = row[index["Owner"]] ?? "";
  const dependsOn = row[index["Depends On"]] ?? "";
  const definitionOfDone = row[index["Definition of Done"]] ?? "";
  const docsRequired = row[index["Docs Required"]] ?? "";
  const repoPath = row[index["Repo Path"]] ?? "";
  const priority = row[index["Priority"]] ?? "";

  const description = [
    priority ? `Priority: ${priority}` : "",
    dependsOn ? `Depends on: ${dependsOn}` : "",
    definitionOfDone ? `Definition of done: ${definitionOfDone}` : "",
    docsRequired ? `Docs: ${docsRequired}` : "",
    repoPath ? `Path: ${repoPath}` : ""
  ]
    .filter(Boolean)
    .join(" ");

  outputRows.push([
    `${taskId} - ${title}`,
    description,
    area,
    status,
    owner
  ]);
}

writeFileSync("docs/process/notion-board-import.csv", `${toCsv(outputRows)}\n`);
console.log("Generated docs/process/notion-board-import.csv");

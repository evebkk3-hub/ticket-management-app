import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sourceRoot = process.argv[2] || "C:\\Users\\lenovo\\Downloads";
const outputDirectory = process.argv[3] || "tmp\\downloads-memory-audit\\pdf";
const pdfModulePath = path.resolve(
  "tmp",
  "downloads-memory-audit",
  "runtime",
  "node_modules",
  "pdfjs-dist",
  "legacy",
  "build",
  "pdf.mjs",
);
const pdfjs = await import(pathToFileURL(pdfModulePath).href);

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

function safeName(value) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").slice(0, 150);
}

await fs.mkdir(outputDirectory, { recursive: true });
const files = (await walk(sourceRoot))
  .filter((file) => path.extname(file).toLowerCase() === ".pdf")
  .sort((a, b) => a.localeCompare(b, "en"));
const results = [];

for (let index = 0; index < files.length; index += 1) {
  const file = files[index];
  const relativePath = path.relative(sourceRoot, file);
  const startedAt = Date.now();
  process.stdout.write(`START\t${index + 1}\t${files.length}\t${relativePath}\n`);
  let task;
  try {
    const bytes = new Uint8Array(await fs.readFile(file));
    task = pdfjs.getDocument({
      data: bytes,
      disableWorker: true,
      useSystemFonts: true,
      isEvalSupported: false,
    });
    const document = await task.promise;
    const pages = [];
    let totalCharacters = 0;
    let totalItems = 0;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      let pageText = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        pageText += item.str;
        pageText += item.hasEOL ? "\n" : " ";
        totalItems += 1;
      }
      pageText = pageText.replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
      totalCharacters += pageText.length;
      pages.push({
        pageNumber,
        characters: pageText.length,
        textItems: content.items.length,
        text: pageText,
      });
      page.cleanup();
    }
    const stats = await fs.stat(file);
    const elapsedSeconds = Math.round((Date.now() - startedAt) / 10) / 100;
    const payload = {
      path: relativePath,
      extension: ".pdf",
      bytes: stats.size,
      modified: stats.mtime.toISOString(),
      status: "read",
      pageCount: document.numPages,
      totalCharacters,
      totalTextItems: totalItems,
      pages,
      elapsedSeconds,
    };
    const outputName = `${String(index + 1).padStart(3, "0")}-${safeName(path.basename(file, ".pdf"))}.json`;
    await fs.writeFile(path.join(outputDirectory, outputName), JSON.stringify(payload, null, 2), "utf8");
    results.push({
      path: relativePath,
      status: "read",
      pages: document.numPages,
      characters: totalCharacters,
      output: outputName,
      elapsedSeconds,
    });
    await document.destroy();
    process.stdout.write(`DONE\t${index + 1}\t${payload.pageCount}\t${totalCharacters}\t${elapsedSeconds}\t${relativePath}\n`);
  } catch (error) {
    const elapsedSeconds = Math.round((Date.now() - startedAt) / 10) / 100;
    const outputName = `${String(index + 1).padStart(3, "0")}-${safeName(path.basename(file, ".pdf"))}-ERROR.json`;
    const payload = {
      path: relativePath,
      extension: ".pdf",
      status: "error",
      error: error instanceof Error ? error.message : String(error),
      elapsedSeconds,
    };
    await fs.writeFile(path.join(outputDirectory, outputName), JSON.stringify(payload, null, 2), "utf8");
    results.push({ ...payload, output: outputName });
    process.stdout.write(`ERROR\t${index + 1}\t${elapsedSeconds}\t${relativePath}\t${payload.error}\n`);
  } finally {
    if (task) {
      try {
        await task.destroy();
      } catch {
        // Best effort cleanup after parsing failures.
      }
    }
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  sourceRoot,
  documentCount: files.length,
  documentsRead: results.filter((item) => item.status === "read").length,
  documentErrors: results.filter((item) => item.status === "error").length,
  totalPages: results.reduce((sum, item) => sum + (item.pages || 0), 0),
  totalCharacters: results.reduce((sum, item) => sum + (item.characters || 0), 0),
  documents: results,
};
await fs.writeFile(path.join(outputDirectory, "_summary.json"), JSON.stringify(summary, null, 2), "utf8");
process.stdout.write(`SUMMARY\t${summary.documentsRead}\t${summary.documentErrors}\t${summary.totalPages}\t${summary.totalCharacters}\n`);

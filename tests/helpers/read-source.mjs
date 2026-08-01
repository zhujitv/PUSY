import { readFile } from "node:fs/promises";
import ts from "typescript";

const workspaceRoot = new URL("../../", import.meta.url);
const cssImportPattern = /@import\s+["']([^"']+)["'];?/g;
const extensionCandidates = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".css", ".json"];

function hasRuntimeImport(importClause) {
  if (!importClause) return true;
  if (importClause.isTypeOnly) return false;
  if (importClause.name) return true;
  const bindings = importClause.namedBindings;
  if (!bindings || ts.isNamespaceImport(bindings)) return Boolean(bindings);
  return bindings.elements.some((element) => !element.isTypeOnly);
}

function hasRuntimeExport(node) {
  if (node.isTypeOnly) return false;
  if (!node.exportClause || !ts.isNamedExports(node.exportClause)) return true;
  return node.exportClause.elements.some((element) => !element.isTypeOnly);
}

function scriptKind(fileName) {
  if (fileName.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (fileName.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (fileName.endsWith(".js") || fileName.endsWith(".mjs")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

export function runtimeModuleSpecifiers(source, fileName = "source.ts") {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, scriptKind(fileName));
  const specifiers = [];
  const add = (value) => {
    if (value.startsWith(".") && !specifiers.includes(value)) specifiers.push(value);
  };

  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
      if (hasRuntimeImport(node.importClause)) add(node.moduleSpecifier.text);
      return;
    }
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      if (hasRuntimeExport(node)) add(node.moduleSpecifier.text);
      return;
    }
    if (ts.isCallExpression(node) && node.arguments.length === 1 && ts.isStringLiteralLike(node.arguments[0])) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === "require")) {
        add(node.arguments[0].text);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

async function readResolvedModule(specifier, importerUrl) {
  const baseUrl = new URL(specifier, importerUrl);
  const candidates = baseUrl.pathname.match(/\.[a-z0-9]+$/i)
    ? [baseUrl]
    : [
        ...extensionCandidates.map((extension) => new URL(`${baseUrl.href}${extension}`)),
        ...extensionCandidates.slice(1).map((extension) => new URL(`index${extension}`, `${baseUrl.href}/`)),
      ];

  for (const candidate of candidates) {
    try {
      return { source: await readFile(candidate, "utf8"), url: candidate };
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") continue;
      throw error;
    }
  }

  throw new Error(`无法解析 ${specifier}，引用位置：${importerUrl.pathname}`);
}

function relativeSpecifiers(source, sourceUrl) {
  if (!sourceUrl.pathname.endsWith(".css")) return runtimeModuleSpecifiers(source, sourceUrl.pathname);
  return [...source.matchAll(cssImportPattern)]
    .map((match) => match[1])
    .filter((specifier) => specifier.startsWith("."));
}

async function collectSource(source, sourceUrl, visited) {
  if (visited.has(sourceUrl.href)) return "";
  visited.add(sourceUrl.href);

  const sections = [source];
  for (const specifier of relativeSpecifiers(source, sourceUrl)) {
    const resolved = await readResolvedModule(specifier, sourceUrl);
    const dependencySource = await collectSource(resolved.source, resolved.url, visited);
    if (dependencySource) sections.push(dependencySource);
  }
  return sections.join("\n");
}

export async function readSource(path) {
  const sourceUrl = new URL(path, workspaceRoot);
  const source = await readFile(sourceUrl, "utf8");
  return collectSource(source, sourceUrl, new Set());
}

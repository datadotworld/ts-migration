import ts from "typescript";
import * as utils from "tsutils";
import { NodeWrap } from "tsutils";

const IGNORE_TEXT = "// @ts-ignore";
const missingTypesPackages = new Set<string>();

// JsxElement = 260,
// JsxSelfClosingElement = 261,
// JsxOpeningElement = 262,
// JsxClosingElement = 263,
// JsxFragment = 264,
// JsxOpeningFragment = 265,
// JsxClosingFragment = 266,
// JsxAttribute = 267,
// JsxAttributes = 268,
// JsxSpreadAttribute = 269,
// JsxExpression = 270,
function findParentJSX(n: NodeWrap | undefined): [number, NodeWrap] | null {
  if (n) {
    if (
      n.kind >= ts.SyntaxKind.JsxElement &&
      n.kind <= ts.SyntaxKind.JsxExpression
    ) {
      return [n.kind, n];
    }
    return findParentJSX(n.parent);
  }
  return null;
}

function getLine(diagnostic: ts.Diagnostic, position?: number) {
  const { line } = diagnostic!.file!.getLineAndCharacterOfPosition(
    position || diagnostic.start!
  );
  return line;
}

function specificIgnoreText(diagnostic: ts.Diagnostic) {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, ";");
  const code = diagnostic.code ? ` (${diagnostic.code})` : "";

  const missingTypes = message.match(
    /^Could not find a declaration file for module '(([a-z]|[A-Z]|[0-9]|\-|\.|\@|\/)*)'/
  );
  if (missingTypes) {
    const packageName = `@types/${missingTypes[1]}`;
    missingTypesPackages.add(packageName);
    return `Missing "${packageName}"${code}`;
  }

  if (message.endsWith(" has no default export.")) {
    return `Use "import * as Foo from 'foo'" syntax if 'foo' does not export a default value.${code}`;
  }

  return `${message}${code}`;
}

function nodeContainsTSIgnore(node: ts.Node): boolean {
  return ts.isJsxText(node) && node.text.includes(IGNORE_TEXT);
}

function ignoreText(diagnostic: ts.Diagnostic, rootDir: string) {
  const specificText = specificIgnoreText(diagnostic);

  return specificText == null
    ? IGNORE_TEXT
    : `${IGNORE_TEXT} -- ${specificText.replace(rootDir, "")}`;
}

export function getMissingTypePackages() {
  return [...missingTypesPackages].sort();
}

export function insertIgnore(
  diagnostic: ts.Diagnostic,
  codeSplitByLine: string[],
  includeJSX: boolean,
  rootDir: string
) {
  // We'll add a counter to track large files
  const fileSize = codeSplitByLine.length;
  if (fileSize > 10000) {
    console.log(`~~~ Warning: Processing large file with ${fileSize} lines`);
  }
  
  // Get the diagnostic filename for better logging
  const fileName = diagnostic.file?.fileName || 'unknown';
  const shortFileName = fileName.split('/').pop() || 'unknown';
  
  try {
    const startMemory = process.memoryUsage().heapUsed;
    const startTime = Date.now();
    
    // Convert AST - potential memory issue here
    const convertedAST = utils.convertAst(diagnostic.file!);
    
    if (Date.now() - startTime > 1000) {
      console.log(`~~~ convertAst for ${shortFileName} took ${(Date.now() - startTime)}ms, Memory change: ${Math.round((process.memoryUsage().heapUsed - startMemory) / 1024 / 1024)}MB`);
    }
    
    const nodeStartTime = Date.now();
    const n = utils.getWrappedNodeAtPosition(
      convertedAST.wrapped,
      diagnostic.start!
    );
    
    if (Date.now() - nodeStartTime > 500) {
      console.log(`~~~ getWrappedNodeAtPosition for ${shortFileName} took ${(Date.now() - nodeStartTime)}ms`);
    }
    
    const line = getLine(diagnostic);
    const isInJSX = findParentJSX(n);
    
    if (!includeJSX) {
      // Don't add ignores in JSX since it's too hard.
      return codeSplitByLine;
    }

    const ignoreComment = ignoreText(diagnostic, rootDir);
    
    // Create new arrays efficiently to avoid excessive memory use
    let maybeResult;
    if (isInJSX) {
      maybeResult = [
        ...codeSplitByLine.slice(0, line),
        IGNORE_TEXT,
        ...codeSplitByLine.slice(line)
      ];
      
      const jsxStartTime = Date.now();
      // This is potentially memory-intensive for large files
      const sourceFile = ts.createSourceFile(
        diagnostic.file!.fileName,
        maybeResult.join("\n"),
        ts.ScriptTarget.ESNext
      );
      
      if (Date.now() - jsxStartTime > 1000) {
        console.log(`~~~ Creating source file for JSX in ${shortFileName} took ${(Date.now() - jsxStartTime)}ms, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
      }
      
      const newConvertedAst = utils.convertAst(sourceFile);

      if (newConvertedAst.flat.some(nodeContainsTSIgnore)) {
        return [
          ...codeSplitByLine.slice(0, line),
          "{ /*",
          `${ignoreComment} */ }`,
          ...codeSplitByLine.slice(line)
        ];
      }
    }

    // Ensure proper sequencing of eslint ignores and ts-ignores
    if (
      codeSplitByLine.length > 0 &&
      line > 0 &&
      codeSplitByLine[line - 1].includes("// eslint-disable-next-line")
    ) {
      return [
        ...codeSplitByLine.slice(0, line - 1),
        ignoreComment,
        codeSplitByLine[line - 1],
        ...codeSplitByLine.slice(line)
      ];
    }
    
    const result = [
      ...codeSplitByLine.slice(0, line),
      ignoreComment,
      ...codeSplitByLine.slice(line)
    ];
    
    const totalTime = Date.now() - startTime;
    const totalMemoryChange = Math.round((process.memoryUsage().heapUsed - startMemory) / 1024 / 1024);
    
    if (totalTime > 1000 || totalMemoryChange > 20) {
      console.log(`~~~ insertIgnore for ${shortFileName} took ${totalTime}ms, Memory change: ${totalMemoryChange}MB`);
    }
    
    return result;
  } catch (error) {
    console.error(`~~~ Error in insertIgnore for file ${shortFileName}: ${error}`);
    // Return original lines in case of error to avoid corrupting the file
    return codeSplitByLine;
  }
}

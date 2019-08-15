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

  const missingTypes = message.match(
    /^Could not find a declaration file for module '(([a-z]|[A-Z]|[0-9]|\-|\.|\@|\/)*)'/
  );
  if (missingTypes) {
    const packageName = `@types/${missingTypes[1]}`;
    missingTypesPackages.add(packageName);
    return `Missing "${packageName}"`;
  }

  if (message.endsWith(" has no default export.")) {
    return `Use "import * as Foo from 'foo'" syntax if 'foo' does not export a default value.`;
  }

  return message;
}

function nodeContainsTSIgnore(node: ts.Node): boolean {
  return ts.isJsxText(node) && node.text.includes(IGNORE_TEXT);
}

function ignoreText(diagnostic: ts.Diagnostic) {
  const specificText = specificIgnoreText(diagnostic);

  return specificText == null
    ? IGNORE_TEXT
    : `${IGNORE_TEXT} -- ${specificText}`;
}

export function getMissingTypePackages() {
  return [...missingTypesPackages].sort();
}

export function insertIgnore(
  diagnostic: ts.Diagnostic,
  codeSplitByLine: string[],
  includeJSX: boolean
) {
  const convertedAST = utils.convertAst(diagnostic.file!);
  const n = utils.getWrappedNodeAtPosition(
    convertedAST.wrapped,
    diagnostic.start!
  );
  const line = getLine(diagnostic);

  const isInJSX = findParentJSX(n);
  if (isInJSX && !includeJSX) {
    // Don't add ignores in JSX since it's too hard.
    return codeSplitByLine;
  }

  const ignoreComment = ignoreText(diagnostic);
  const maybeResult = [
    ...codeSplitByLine.slice(0, line),
    IGNORE_TEXT,
    ...codeSplitByLine.slice(line)
  ];

  if (isInJSX) {
    const sourceFile = ts.createSourceFile(
      diagnostic.file!.fileName,
      maybeResult.join("\n"),
      ts.ScriptTarget.ESNext
    );
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

  return [
    ...codeSplitByLine.slice(0, line),
    ignoreComment,
    ...codeSplitByLine.slice(line)
  ];
}

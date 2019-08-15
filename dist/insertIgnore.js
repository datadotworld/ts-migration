"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_1 = __importDefault(require("typescript"));
const utils = __importStar(require("tsutils"));
const IGNORE_TEXT = "// @ts-ignore";
const missingTypesPackages = new Set();
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
function findParentJSX(n) {
    if (n) {
        if (n.kind >= typescript_1.default.SyntaxKind.JsxElement &&
            n.kind <= typescript_1.default.SyntaxKind.JsxExpression) {
            return [n.kind, n];
        }
        return findParentJSX(n.parent);
    }
    return null;
}
function getLine(diagnostic, position) {
    const { line } = diagnostic.file.getLineAndCharacterOfPosition(position || diagnostic.start);
    return line;
}
function specificIgnoreText(diagnostic) {
    const message = typescript_1.default.flattenDiagnosticMessageText(diagnostic.messageText, ";");
    const missingTypes = message.match(/^Could not find a declaration file for module '(([a-z]|[A-Z]|[0-9]|\-|\.|\@|\/)*)'/);
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
function nodeContainsTSIgnore(node) {
    return typescript_1.default.isJsxText(node) && node.text.includes(IGNORE_TEXT);
}
function ignoreText(diagnostic) {
    const specificText = specificIgnoreText(diagnostic);
    return specificText == null
        ? IGNORE_TEXT
        : `${IGNORE_TEXT} -- ${specificText}`;
}
function getMissingTypePackages() {
    return [...missingTypesPackages].sort();
}
exports.getMissingTypePackages = getMissingTypePackages;
function insertIgnore(diagnostic, codeSplitByLine, includeJSX) {
    const convertedAST = utils.convertAst(diagnostic.file);
    const n = utils.getWrappedNodeAtPosition(convertedAST.wrapped, diagnostic.start);
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
        const sourceFile = typescript_1.default.createSourceFile(diagnostic.file.fileName, maybeResult.join("\n"), typescript_1.default.ScriptTarget.ESNext);
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
exports.insertIgnore = insertIgnore;
//# sourceMappingURL=insertIgnore.js.map
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertIgnore = exports.getMissingTypePackages = void 0;
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
    const code = diagnostic.code ? ` (${diagnostic.code})` : "";
    const missingTypes = message.match(/^Could not find a declaration file for module '(([a-z]|[A-Z]|[0-9]|\-|\.|\@|\/)*)'/);
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
function nodeContainsTSIgnore(node) {
    return typescript_1.default.isJsxText(node) && node.text.includes(IGNORE_TEXT);
}
function ignoreText(diagnostic, rootDir) {
    const specificText = specificIgnoreText(diagnostic);
    return specificText == null
        ? IGNORE_TEXT
        : `${IGNORE_TEXT} -- ${specificText.replace(rootDir, "")}`;
}
function getMissingTypePackages() {
    return [...missingTypesPackages].sort();
}
exports.getMissingTypePackages = getMissingTypePackages;
function insertIgnore(diagnostic, codeSplitByLine, includeJSX, rootDir) {
    const convertedAST = utils.convertAst(diagnostic.file);
    const n = utils.getWrappedNodeAtPosition(convertedAST.wrapped, diagnostic.start);
    const line = getLine(diagnostic);
    const isInJSX = findParentJSX(n);
    if (!includeJSX) {
        // Don't add ignores in JSX since it's too hard.
        return codeSplitByLine;
    }
    const ignoreComment = ignoreText(diagnostic, rootDir);
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
    // Ensure proper sequencing of eslint ignores and ts-ignores
    if (codeSplitByLine.length > 0 &&
        line > 0 &&
        codeSplitByLine[line - 1].includes("// eslint-disable-next-line")) {
        return [
            ...codeSplitByLine.slice(0, line - 1),
            ignoreComment,
            codeSplitByLine[line - 1],
            ...codeSplitByLine.slice(line)
        ];
    }
    return [
        ...codeSplitByLine.slice(0, line),
        ignoreComment,
        ...codeSplitByLine.slice(line)
    ];
}
exports.insertIgnore = insertIgnore;
//# sourceMappingURL=insertIgnore.js.map
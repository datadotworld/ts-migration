import ts from "typescript";
export declare function getMissingTypePackages(): string[];
export declare function insertIgnore(diagnostic: ts.Diagnostic, codeSplitByLine: string[], includeJSX: boolean, rootDir: string): string[];

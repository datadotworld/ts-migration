"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const fs_1 = require("fs");
const insertIgnore_1 = require("./insertIgnore");
const commitAll_1 = __importDefault(require("./commitAll"));
const prettierFormat_1 = __importDefault(require("./prettierFormat"));
const tsCompilerHelpers_1 = require("./tsCompilerHelpers");
const successFiles = [];
const errorFiles = [];
function compile(paths, shouldCommit, includeJSX) {
    return __awaiter(this, void 0, void 0, function* () {
        const diagnostics = yield tsCompilerHelpers_1.getDiagnostics(paths);
        const diagnosticsWithFile = diagnostics.filter(d => !!d.file && !paths.exclude.some(e => d.file.fileName.includes(e)));
        const diagnosticsGroupedByFile = lodash_1.groupBy(diagnosticsWithFile, d => d.file.fileName);
        Object.keys(diagnosticsGroupedByFile).forEach((fileName, i, arr) => __awaiter(this, void 0, void 0, function* () {
            const fileDiagnostics = lodash_1.uniqBy(diagnosticsGroupedByFile[fileName], d => d.file.getLineAndCharacterOfPosition(d.start)).reverse();
            console.log(`${i} of ${arr.length - 1}: Ignoring ${fileDiagnostics.length} ts-error(s) in ${fileName}`);
            try {
                const filePath = tsCompilerHelpers_1.getFilePath(paths, fileDiagnostics[0]);
                let codeSplitByLine = fs_1.readFileSync(filePath, 'utf8').split('\n');
                fileDiagnostics.forEach((diagnostic, _errorIndex) => {
                    codeSplitByLine = insertIgnore_1.insertIgnore(diagnostic, codeSplitByLine, includeJSX);
                });
                const fileData = codeSplitByLine.join('\n');
                const formattedFileData = prettierFormat_1.default(fileData, paths.rootDir);
                fs_1.writeFileSync(filePath, formattedFileData);
                successFiles.push(fileName);
            }
            catch (e) {
                console.log(e);
                errorFiles.push(fileName);
            }
        }));
        if (shouldCommit) {
            yield commitAll_1.default(':see_no_evil: ignore errors', paths);
        }
        console.log(`${successFiles.length} files with errors ignored successfully.`);
        const missingTypePackages = insertIgnore_1.getMissingTypePackages();
        if (missingTypePackages.length > 0) {
            console.log(`Consider adding these package(s):\n${missingTypePackages.join(' ')}`);
        }
        if (errorFiles.length) {
            console.log(`Error handling ${errorFiles.length} files:`);
            console.log(errorFiles);
        }
    });
}
exports.default = compile;
//# sourceMappingURL=ignoreErrorsRunner.js.map
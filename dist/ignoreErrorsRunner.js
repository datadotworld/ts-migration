"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const fs_1 = __importStar(require("fs"));
const insertIgnore_1 = require("./insertIgnore");
const commitAll_1 = __importDefault(require("./commitAll"));
const prettierFormat_1 = __importDefault(require("./prettierFormat"));
const tsCompilerHelpers_1 = require("./tsCompilerHelpers");
const collectFiles_1 = __importDefault(require("./collectFiles"));
const util_1 = require("util");
const successFiles = [];
const errorFiles = [];
const readFile = util_1.promisify(fs_1.default.readFile);
const writeFile = util_1.promisify(fs_1.default.writeFile);
function removeIgnores(paths) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Removing all existing @ts-ignores from input files");
        const start = new Date();
        const files = yield collectFiles_1.default(paths);
        let modifiedCount = 0;
        yield Promise.all(files.map((file) => __awaiter(this, void 0, void 0, function* () {
            const contents = yield readFile(file, "utf8");
            const updatedContents = [
                // Start with the JSX ignores, since they span multiple lines and need to be
                // cleaned before we attempt any of the subsequent single-line scrubbing
                {
                    re: new RegExp(/\s*\{\/\*\s*\/\/ @ts-ignore.*\*\/\}/, "gm"),
                    replacement: ""
                },
                // Scrub any trailing comments that might exist (internary )
                {
                    re: new RegExp(/^(.*\S+.*)\/\/ @ts-ignore.*$/, "gm"),
                    replacement: "$1"
                },
                // // Now remove any remaining lines that have optional whitespace plus a ts-ignore comment
                { re: new RegExp(/^.*\/\/ @ts-ignore.*$\n/, "gm"), replacement: "" }
            ].reduce((currentContents, replacer) => currentContents.replace(replacer.re, replacer.replacement), contents);
            if (updatedContents !== contents) {
                console.log(`Scrubbed existing ignores from ${file}`);
                yield writeFile(file, updatedContents, "utf8");
                modifiedCount++;
            }
        })));
        console.log(`Finished scrubbing ${modifiedCount} of ${files.length} in ${(new Date().getTime() - start.getTime()) / 1000} seconds`);
    });
}
exports.removeIgnores = removeIgnores;
function compile(paths, shouldCommit, includeJSX) {
    return __awaiter(this, void 0, void 0, function* () {
        const diagnostics = yield tsCompilerHelpers_1.getDiagnostics(paths);
        const diagnosticsWithFile = diagnostics.filter(d => !!d.file && !paths.exclude.some(e => d.file.fileName.includes(e)));
        const diagnosticsGroupedByFile = lodash_1.groupBy(diagnosticsWithFile, d => d.file.fileName);
        Object.keys(diagnosticsGroupedByFile).forEach((fileName, i, arr) => __awaiter(this, void 0, void 0, function* () {
            const fileDiagnostics = lodash_1.uniqBy(diagnosticsGroupedByFile[fileName], d => d.file.getLineAndCharacterOfPosition(d.start)).reverse();
            console.log(`${i + 1} of ${arr.length}: Ignoring ${fileDiagnostics.length} ts-error(s) in ${fileName}`);
            try {
                const filePath = tsCompilerHelpers_1.getFilePath(paths, fileDiagnostics[0]);
                const modifiedCodeSplitByLine = fileDiagnostics.reduce((codeSplitByLine, diagnostic) => insertIgnore_1.insertIgnore(diagnostic, codeSplitByLine, includeJSX, paths.rootDir), fs_1.readFileSync(filePath, "utf8").split("\n"));
                const fileData = modifiedCodeSplitByLine.join("\n");
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
            yield commitAll_1.default(":see_no_evil: ignore errors", paths);
        }
        console.log(`${successFiles.length} files with errors ignored successfully.`);
        const missingTypePackages = insertIgnore_1.getMissingTypePackages();
        if (missingTypePackages.length > 0) {
            console.log(`Consider adding these package(s):\n${missingTypePackages.join(" ")}`);
        }
        if (errorFiles.length) {
            console.log(`Error handling ${errorFiles.length} files:`);
            console.log(errorFiles);
        }
    });
}
exports.default = compile;
//# sourceMappingURL=ignoreErrorsRunner.js.map
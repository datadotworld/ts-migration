"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const simple_git_1 = require("simple-git");
const util_1 = require("util");
const collectFiles_1 = __importDefault(require("./collectFiles"));
const converter_1 = __importDefault(require("./converter"));
const util_2 = require("./util");
const commitAll_1 = __importDefault(require("./commitAll"));
const exists = (0, util_1.promisify)(fs_1.default.exists);
function process(filePaths, shouldCommit, shouldRename, filesFromCLI) {
    return __awaiter(this, void 0, void 0, function* () {
        const git = (0, simple_git_1.simpleGit)(filePaths.projectDir);
        const files = filesFromCLI || (yield (0, collectFiles_1.default)(filePaths));
        console.log(`Converting ${files.length} files`);
        const { successFiles, errorFiles } = yield (0, converter_1.default)(files, filePaths.projectDir);
        console.log(`${successFiles.length} converted successfully.`);
        console.log(`${errorFiles.length} errors:`);
        if (errorFiles.length)
            console.log(errorFiles);
        if (shouldCommit) {
            yield (0, commitAll_1.default)(":construction: convert files to typescript", filePaths);
        }
        else {
            console.log("skipping commit in dry run mode");
        }
        if (shouldRename) {
            const renameErrors = [];
            console.log("renaming files");
            const snapsFound = [];
            const snapsNotFound = [];
            const fsRename = (0, util_1.promisify)(fs_1.default.rename);
            const mv = (oldPath, newPath) => __awaiter(this, void 0, void 0, function* () {
                // Using fs.rename + add/rm, because git.mv demands that all files are already tracked by git,
                // which isn't always the case for our branch conversions.
                yield fsRename(oldPath, newPath);
                yield git.add(newPath);
                yield git.rm(oldPath);
            });
            function renameSnap(path, oldExt, newExt) {
                return __awaiter(this, void 0, void 0, function* () {
                    const parsedPath = path_1.default.parse(path);
                    const jsSnapPath = `${parsedPath.dir}/__snapshots__/${parsedPath.name}${oldExt}.snap`;
                    const tsSnapPath = `${parsedPath.dir}/__snapshots__/${parsedPath.name}${newExt}.snap`;
                    if (yield exists(jsSnapPath)) {
                        console.log(`Renaming ${jsSnapPath} to ${tsSnapPath}`);
                        snapsFound.push(jsSnapPath);
                        try {
                            yield mv(jsSnapPath, tsSnapPath);
                        }
                        catch (e) {
                            console.log(e);
                            renameErrors.push(path);
                        }
                    }
                    else {
                        snapsNotFound.push(jsSnapPath);
                    }
                });
            }
            function containsReact(path) {
                const file = fs_1.default.readFileSync(path, "utf8");
                return file.includes("from 'react'");
            }
            yield (0, util_2.asyncForEach)(successFiles, (path, i) => __awaiter(this, void 0, void 0, function* () {
                console.log(`${i + 1} of ${successFiles.length}: Renaming ${path}`);
                try {
                    const parsedPath = path_1.default.parse(path);
                    const oldExt = parsedPath.ext;
                    const newExt = (() => {
                        if (oldExt === "jsx")
                            return ".tsx";
                        return containsReact(path) ? ".tsx" : ".ts";
                    })();
                    const newPath = path.replace(oldExt, newExt);
                    yield mv(path, newPath);
                    if (path.includes("__tests__") || path.includes("-test")) {
                        yield renameSnap(path, oldExt, newExt);
                    }
                }
                catch (e) {
                    console.log(e);
                    renameErrors.push(path);
                }
            }));
            console.log(`${renameErrors.length} errors renaming files`);
            if (renameErrors.length)
                console.log(renameErrors);
            console.log(`Snaps found: ${snapsFound.length}`);
            console.log(`Snaps Not found: ${snapsNotFound.length}`);
            if (shouldCommit) {
                yield (0, commitAll_1.default)(":truck: rename files to .ts/.tsx", filePaths);
            }
            console.log(`${successFiles.length} converted successfully.`);
            console.log(`${errorFiles.length} errors`);
            if (errorFiles.length)
                console.log(errorFiles);
        }
    });
}
exports.default = process;
//# sourceMappingURL=convertCodebase.js.map
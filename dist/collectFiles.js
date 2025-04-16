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
const fs_1 = __importDefault(require("fs"));
const util_1 = require("util");
const path_1 = require("path");
const readdir = (0, util_1.promisify)(fs_1.default.readdir);
const stat = (0, util_1.promisify)(fs_1.default.stat);
function getFiles(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        const startTime = Date.now();
        const subdirs = yield readdir(dir);
        // Process directories in batches to avoid memory issues
        const batchSize = 50;
        const results = [];
        for (let i = 0; i < subdirs.length; i += batchSize) {
            const batch = subdirs.slice(i, i + batchSize);
            const batchFiles = yield Promise.all(batch.map((subdir) => __awaiter(this, void 0, void 0, function* () {
                const res = (0, path_1.resolve)(dir, subdir);
                try {
                    const stats = yield stat(res);
                    return stats.isDirectory() ? getFiles(res) : res;
                }
                catch (err) {
                    console.log(`~~~ Error processing ${res}: ${err}`);
                    return [];
                }
            })));
            for (const files of batchFiles) {
                if (Array.isArray(files)) {
                    results.push(...files);
                }
                else if (typeof files === 'string') {
                    results.push(files);
                }
            }
            if (i % 100 === 0 && i > 0) {
                console.log(`~~~ getFiles processing directory ${dir}: ${i}/${subdirs.length} subdirs, found ${results.length} files so far, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
            }
        }
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed > 1.0) {
            console.log(`~~~ getFiles for ${dir} took ${elapsed.toFixed(2)}s, found ${results.length} files, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
        }
        return results;
    });
}
function collectFiles(paths) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`~~~ collectFiles started, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
        const startTime = Date.now();
        const filesArr = yield Promise.all(paths.include.map((include) => __awaiter(this, void 0, void 0, function* () {
            console.log(`~~~ Processing include path: ${include}`);
            try {
                const isFile = (yield stat(include)).isFile();
                return isFile ? [include] : yield getFiles(include);
            }
            catch (err) {
                console.log(`~~~ Error processing include path ${include}: ${err}`);
                return [];
            }
        })));
        console.log(`~~~ All include paths processed, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
        // Flatten arrays carefully to avoid heap issues
        let files = [];
        for (const fileArray of filesArr) {
            files = files.concat(fileArray);
        }
        console.log(`~~~ Found ${files.length} total files before filtering, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
        const filesWithExtensions = files.filter(f => {
            return paths.extensions.some(e => f.endsWith(e));
        });
        console.log(`~~~ After extension filtering: ${filesWithExtensions.length} files, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
        const filesWithoutExclusions = filesWithExtensions.filter(f => {
            return !paths.exclude.some(e => f.includes(e));
        });
        console.log(`~~~ After exclusion filtering: ${filesWithoutExclusions.length} files, Time: ${((Date.now() - startTime) / 1000).toFixed(2)}s, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
        return filesWithoutExclusions;
    });
}
exports.default = collectFiles;
//# sourceMappingURL=collectFiles.js.map
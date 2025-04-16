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
exports.getFilePath = exports.getDiagnostics = exports.createTSCompiler = void 0;
const typescript_1 = __importDefault(require("typescript"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const collectFiles_1 = __importDefault(require("./collectFiles"));
function createTSCompiler(projectDir) {
    const configPath = path_1.default.join(projectDir, "tsconfig.json");
    const configJSON = typescript_1.default.readConfigFile(configPath, typescript_1.default.sys.readFile);
    let extendedCompilerOptions = {};
    if (configJSON.config.extends) {
        const extendedConfigPath = path_1.default.join(projectDir, configJSON.config.extends);
        const extendedConfigJSON = typescript_1.default.readConfigFile(extendedConfigPath, typescript_1.default.sys.readFile);
        extendedCompilerOptions = extendedConfigJSON.config.compilerOptions;
    }
    const compilerOptions = typescript_1.default.convertCompilerOptionsFromJson(Object.assign(Object.assign({}, extendedCompilerOptions), configJSON.config.compilerOptions), projectDir);
    return {
        configJSON,
        compilerOptions
    };
}
exports.createTSCompiler = createTSCompiler;
function getDiagnostics(paths) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`~~~ getDiagnostics started, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
        const startTime = Date.now();
        const files = yield (0, collectFiles_1.default)(paths);
        console.log(`~~~ collectFiles returned ${files.length} files, Time: ${((Date.now() - startTime) / 1000).toFixed(2)}s, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
        const compilerStartTime = Date.now();
        const { compilerOptions } = createTSCompiler(paths.projectDir);
        console.log(`~~~ createTSCompiler completed, Time: ${((Date.now() - compilerStartTime) / 1000).toFixed(2)}s, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
        const programStartTime = Date.now();
        console.log(`~~~ Creating TypeScript program with ${files.length} files...`);
        // Run garbage collection if available to minimize memory before heavy operations
        if (global.gc) {
            console.log(`~~~ Running garbage collection before creating TypeScript program`);
            global.gc();
            console.log(`~~~ After garbage collection, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
        }
        const program = typescript_1.default.createProgram(files, compilerOptions.options);
        console.log(`~~~ TypeScript program created, Time: ${((Date.now() - programStartTime) / 1000).toFixed(2)}s, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
        const diagnosticsStartTime = Date.now();
        console.log(`~~~ Getting pre-emit diagnostics...`);
        const diagnostics = typescript_1.default.getPreEmitDiagnostics(program);
        console.log(`~~~ Got ${diagnostics.length} total diagnostics, Time: ${((Date.now() - diagnosticsStartTime) / 1000).toFixed(2)}s, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
        const filterStartTime = Date.now();
        const filteredDiagnostics = diagnostics.filter(diagnostic => diagnostic.file !== undefined && paths.include.some(includedPath => diagnostic.file.fileName.includes(includedPath)));
        console.log(`~~~ Filtered to ${filteredDiagnostics.length} diagnostics for included paths, Time: ${((Date.now() - filterStartTime) / 1000).toFixed(2)}s, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
        // Run garbage collection to clean up memory after heavy operations
        if (global.gc) {
            console.log(`~~~ Running garbage collection after getting diagnostics`);
            global.gc();
            console.log(`~~~ After garbage collection, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
        }
        console.log(`~~~ getDiagnostics complete, Total Time: ${((Date.now() - startTime) / 1000).toFixed(2)}s, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
        return filteredDiagnostics;
    });
}
exports.getDiagnostics = getDiagnostics;
function getFilePath(paths, diagnostic) {
    const fileName = diagnostic.file.fileName;
    let filePath = path_1.default.join(paths.projectDir, fileName);
    if (!(0, fs_1.existsSync)(filePath)) {
        filePath = fileName;
        if (!(0, fs_1.existsSync)(filePath)) {
            throw new Error(`${filePath} does not exist`);
        }
    }
    return filePath;
}
exports.getFilePath = getFilePath;
//# sourceMappingURL=tsCompilerHelpers.js.map
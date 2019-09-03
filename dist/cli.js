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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(require("commander"));
const tsCompilerHelpers_1 = require("./tsCompilerHelpers");
const stripCommentsRunner_1 = __importDefault(require("./stripCommentsRunner"));
const ignoreErrorsRunner_1 = __importStar(require("./ignoreErrorsRunner"));
const ignoreFileErrorsRunner_1 = __importDefault(require("./ignoreFileErrorsRunner"));
const convertCodebase_1 = __importDefault(require("./convertCodebase"));
const checkRunner_1 = __importDefault(require("./checkRunner"));
const path_1 = __importDefault(require("path"));
const constructPaths = (projectDir = process.cwd()) => {
    const rootDir = process.cwd();
    if (!path_1.default.isAbsolute(projectDir)) {
        projectDir = path_1.default.resolve(projectDir);
    }
    if (rootDir !== projectDir) {
        process.chdir(projectDir);
    }
    const { configJSON } = tsCompilerHelpers_1.createTSCompiler(projectDir);
    return {
        rootDir,
        projectDir,
        include: configJSON.config.include || [],
        exclude: configJSON.config.exclude || [],
        extensions: [".ts", ".tsx"]
    };
};
commander_1.default
    .command("strip-comments")
    .option("--project <path>")
    .option("-c, --commit")
    .option("--comments <list>", "A comma-seperated list of comments to strip. Must start with `//`", (f) => f.split(","))
    .action((cmd) => {
    console.log("Stripping comments from files...");
    const filePaths = constructPaths(cmd.project);
    if (cmd.comments)
        console.log("Removing comments: ", cmd.comments);
    stripCommentsRunner_1.default(filePaths, cmd.comments, !!cmd.commit);
});
commander_1.default
    .command("convert-codebase")
    .option("--project <path>")
    .option("-c, --commit")
    .option("--rename")
    // TODO support directory?
    .option("--files <list>", "A comma-seperated list of files to convert", (f) => f.split(","))
    .option("--exclude <list>", "A comma-seperated list of strings to exclude", (f) => f.split(","))
    .action((cmd) => {
    console.log("Converting the codebase from Flow to Typescript");
    const filePaths = constructPaths(cmd.project);
    const paths = Object.assign({}, filePaths, { exclude: [...filePaths.exclude, ...(cmd.exclude || [])], extensions: [".js", ".jsx"] });
    console.log(paths);
    convertCodebase_1.default(paths, !!cmd.commit, !!cmd.rename, cmd.files);
});
commander_1.default
    .command("ignore-errors")
    .option("--project <path>")
    .option("-c, --commit")
    .option("--removeExisting", "Whether existing @ts-ignore comments should be removed from the input files before re-adding necessary ignores", false)
    .option("--includeJSX", "Insert ignores into JSX -- may cause runtime changes!", true)
    .option("--exclude <list>", "A comma-seperated list of strings to exclude", (f) => f.split(","))
    .option("--files <list>", "A comma-seperated list of files to convert", (f) => f.split(","))
    .action((cmd) => __awaiter(this, void 0, void 0, function* () {
    console.log("Ignoring Typescript errors...");
    const filePaths = constructPaths(cmd.project);
    const paths = cmd.files && cmd.files.length > 0
        ? Object.assign({}, filePaths, { include: [...cmd.files], exclude: [] }) : Object.assign({}, filePaths, { exclude: [...filePaths.exclude, ...(cmd.exclude || [])] });
    console.log(paths);
    if (cmd.removeExisting) {
        yield ignoreErrorsRunner_1.removeIgnores(paths);
    }
    ignoreErrorsRunner_1.default(paths, !!cmd.commit, cmd.includeJSX);
}));
commander_1.default
    .command("ignore-file-errors")
    .option("--project <path>")
    .option("-c, --commit")
    .action((cmd) => {
    console.log("Inserting custom ts-ignore pragmas...");
    const filePaths = constructPaths(cmd.project);
    ignoreFileErrorsRunner_1.default(filePaths, !!cmd.commit);
});
commander_1.default
    .command("check-types")
    .option("--project <path>")
    .option("-c, --commit")
    .action((cmd) => {
    console.log("Checking Typescript types and skipping ignored files...");
    const filePaths = constructPaths(cmd.project);
    checkRunner_1.default(filePaths);
});
commander_1.default.parse(process.argv);
//# sourceMappingURL=cli.js.map
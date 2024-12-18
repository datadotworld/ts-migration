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
Object.defineProperty(exports, "__esModule", { value: true });
const simple_git_1 = require("simple-git");
function commit(message, filePaths) {
    return __awaiter(this, void 0, void 0, function* () {
        const git = (0, simple_git_1.simpleGit)(filePaths.projectDir);
        console.log(`Committing: "${message}"`);
        try {
            yield git.add(".");
        }
        catch (e) {
            console.log("error adding");
            throw new Error(e);
        }
        try {
            yield git.commit(message, undefined, { "-n": "true" });
        }
        catch (e) {
            console.log("error committing");
            throw new Error(e);
        }
    });
}
exports.default = commit;
//# sourceMappingURL=commitAll.js.map
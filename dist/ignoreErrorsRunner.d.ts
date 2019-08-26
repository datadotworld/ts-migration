import { FilePaths } from "./cli";
export declare function removeIgnores(paths: FilePaths): Promise<void>;
export default function compile(paths: FilePaths, shouldCommit: boolean, includeJSX: boolean): Promise<void>;

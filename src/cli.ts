import program from "commander";
import { createTSCompiler } from "./tsCompilerHelpers";
import stripComments from "./stripCommentsRunner";
import ignoreErrors, { removeIgnores } from "./ignoreErrorsRunner";
import ignoreFileErrors from "./ignoreFileErrorsRunner";
import convertCodebase from "./convertCodebase";
import checkTypes from "./checkRunner";
import path from "path";

export interface FilePaths {
  rootDir: string;
  projectDir: string;
  include: string[];
  exclude: string[];
  extensions: string[];
}

const constructPaths = (projectDir: string = '.'): FilePaths => {
  // Ensure that the rootDir ends with the path separator
  const rootDir = path.normalize(path.join(process.cwd(), path.sep));
  const { configJSON } = createTSCompiler(projectDir);
  const include = (configJSON.config.include || []);
  const exclude = (configJSON.config.exclude || []);
  projectDir = path.resolve(projectDir);
  if (projectDir !== rootDir) {
    process.chdir(projectDir);
  }
  return {
    // Ensure the rootDir ends with a trailing path separator
    rootDir: path.normalize(path.join(rootDir, path.sep)),
    projectDir,
    include,
    exclude,
    extensions: [".ts", ".tsx"]
  };
};

program
  .command("strip-comments")
  .option("--project <path>")
  .option("-c, --commit")
  .option(
    "--comments <list>",
    "A comma-seperated list of comments to strip. Must start with `//`",
    (f: string) => f.split(",")
  )
  .action(
    (cmd: {
      project?: string;
      commit: boolean | undefined;
      comments: string[] | undefined;
    }) => {
      console.log("Stripping comments from files...");
      const filePaths = constructPaths(cmd.project);
      if (cmd.comments) console.log("Removing comments: ", cmd.comments);
      stripComments(filePaths, cmd.comments, !!cmd.commit);
    }
  );

program
  .command("convert-codebase")
  .option("--project <path>")
  .option("-c, --commit")
  .option("--rename")
  // TODO support directory?
  .option(
    "--files <list>",
    "A comma-seperated list of files to convert",
    (f: string) => f.split(",")
  )
  .option(
    "--exclude <list>",
    "A comma-seperated list of strings to exclude",
    (f: string) => f.split(",")
  )
  .action(
    (cmd: {
      project?: string;
      commit: boolean | undefined;
      rename: boolean | undefined;
      files: string[] | undefined;
      exclude: string[] | undefined;
    }) => {
      console.log("Converting the codebase from Flow to Typescript");
      const filePaths = constructPaths(cmd.project);
      const paths = {
        ...filePaths,
        exclude: [...filePaths.exclude, ...(cmd.exclude || [])],
        extensions: [".js", ".jsx"]
      };
      console.log(paths);
      convertCodebase(paths, !!cmd.commit, !!cmd.rename, cmd.files);
    }
  );

program
  .command("ignore-errors")
  .option("--project <path>")
  .option("-c, --commit")
  .option(
    "--removeExisting",
    "Whether existing @ts-ignore comments should be removed from the input files before re-adding necessary ignores",
    false
  )
  .option(
    "--includeJSX",
    "Insert ignores into JSX -- may cause runtime changes!",
    true
  )
  .option(
    "--exclude <list>",
    "A comma-seperated list of strings to exclude",
    (f: string) => f.split(",")
  )
  .option(
    "--files <list>",
    "A comma-seperated list of files to convert",
    (f: string) => f.split(",")
  )
  .action(
    async (cmd: {
      project?: string;
      commit: boolean | undefined;
      exclude: string[] | undefined;
      includeJSX: boolean;
      files?: string[];
      removeExisting: boolean | undefined;
    }) => {
      console.log("Ignoring Typescript errors...");
      const filePaths = constructPaths(cmd.project);
      const paths =
        cmd.files && cmd.files.length > 0
          ? {
              ...filePaths,
              include: [...cmd.files],
              exclude: []
            }
          : {
              ...filePaths,
              exclude: [...filePaths.exclude, ...(cmd.exclude || [])]
            };
      console.log(paths);
      if (cmd.removeExisting) {
        await removeIgnores(paths);
      }
      ignoreErrors(paths, !!cmd.commit, cmd.includeJSX);
    }
  );

program
  .command("ignore-file-errors")
  .option("--project <path>")
  .option("-c, --commit")
  .action((cmd: { project?: string; commit: boolean | undefined }) => {
    console.log("Inserting custom ts-ignore pragmas...");
    const filePaths = constructPaths(cmd.project);
    ignoreFileErrors(filePaths, !!cmd.commit);
  });

program
  .command("check-types")
  .option("--project <path>")
  .option("-c, --commit")
  .action((cmd: { project?: string }) => {
    console.log("Checking Typescript types and skipping ignored files...");
    const filePaths = constructPaths(cmd.project);
    checkTypes(filePaths);
  });

program.parse(process.argv);

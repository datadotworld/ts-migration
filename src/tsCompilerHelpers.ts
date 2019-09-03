import ts from "typescript";
import { existsSync } from "fs";

import path from "path";
import collectFiles from "./collectFiles";
import { FilePaths } from "./cli";

export function createTSCompiler(projectDir: string) {
  const configPath = path.join(projectDir, "tsconfig.json");
  const configJSON = ts.readConfigFile(configPath, ts.sys.readFile);

  let extendedCompilerOptions = {};
  if (configJSON.config.extends) {
    const extendedConfigPath = path.join(projectDir, configJSON.config.extends);
    const extendedConfigJSON = ts.readConfigFile(
      extendedConfigPath,
      ts.sys.readFile
    );

    extendedCompilerOptions = extendedConfigJSON.config.compilerOptions;
  }

  const compilerOptions = ts.convertCompilerOptionsFromJson(
    { ...extendedCompilerOptions, ...configJSON.config.compilerOptions },
    projectDir
  );

  return {
    configJSON,
    compilerOptions
  };
}

export async function getDiagnostics(paths: FilePaths) {
  const files = await collectFiles(paths);
  const { compilerOptions } = createTSCompiler(paths.projectDir);

  const program = ts.createProgram(files, compilerOptions.options);

  const diagnostics = ts.getPreEmitDiagnostics(program);
  return diagnostics.filter(diagnostic =>
    paths.include.some(includedPath =>
      diagnostic.file!.fileName.includes(includedPath)
    )
  );
}

export function getFilePath(paths: FilePaths, diagnostic: ts.Diagnostic) {
  const fileName = diagnostic.file!.fileName;
  let filePath = path.join(paths.projectDir, fileName);
  if (!existsSync(filePath)) {
    filePath = fileName;
    if (!existsSync(filePath)) {
      throw new Error(`${filePath} does not exist`);
    }
  }
  return filePath;
}

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
  console.log(`~~~ getDiagnostics started, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  
  const startTime = Date.now();
  const files = await collectFiles(paths);
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
  
  const program = ts.createProgram(files, compilerOptions.options);
  console.log(`~~~ TypeScript program created, Time: ${((Date.now() - programStartTime) / 1000).toFixed(2)}s, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  
  const diagnosticsStartTime = Date.now();
  console.log(`~~~ Getting pre-emit diagnostics...`);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  console.log(`~~~ Got ${diagnostics.length} total diagnostics, Time: ${((Date.now() - diagnosticsStartTime) / 1000).toFixed(2)}s, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  
  const filterStartTime = Date.now();
  const filteredDiagnostics = diagnostics.filter(diagnostic =>
    diagnostic.file !== undefined && paths.include.some(includedPath =>
      diagnostic.file!.fileName.includes(includedPath)
    )
  );
  console.log(`~~~ Filtered to ${filteredDiagnostics.length} diagnostics for included paths, Time: ${((Date.now() - filterStartTime) / 1000).toFixed(2)}s, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  
  // Run garbage collection to clean up memory after heavy operations
  if (global.gc) {
    console.log(`~~~ Running garbage collection after getting diagnostics`);
    global.gc();
    console.log(`~~~ After garbage collection, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  }
  
  console.log(`~~~ getDiagnostics complete, Total Time: ${((Date.now() - startTime) / 1000).toFixed(2)}s, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  return filteredDiagnostics;
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

import { groupBy, uniqBy } from "lodash";
import fs, { readFileSync, writeFileSync } from "fs";
import { insertIgnore, getMissingTypePackages } from "./insertIgnore";
import commit from "./commitAll";
import { getFilePath, getDiagnostics } from "./tsCompilerHelpers";
import { FilePaths } from "./cli";
import collectFiles from "./collectFiles";
import { promisify } from "util";

const successFiles: string[] = [];
const errorFiles: string[] = [];

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
export async function removeIgnores(paths: FilePaths): Promise<void> {
  console.log("Removing all existing @ts-ignores from input files");
  const start = new Date();
  const files = await collectFiles(paths);
  let modifiedCount = 0;
  await Promise.all(
    files.map(async file => {
      const contents = await readFile(file, "utf8");
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
      ].reduce(
        (currentContents, replacer) =>
          currentContents.replace(replacer.re, replacer.replacement),
        contents
      );
      if (updatedContents !== contents) {
        console.log(`Scrubbed existing ignores from ${file}`);
        await writeFile(file, updatedContents, "utf8");
        modifiedCount++;
      }
    })
  );
  console.log(
    `Finished scrubbing ${modifiedCount} of ${
      files.length
    } in ${(new Date().getTime() - start.getTime()) / 1000} seconds`
  );
}

export default async function compile(
  paths: FilePaths,
  shouldCommit: boolean,
  includeJSX: boolean
): Promise<void> {
  console.log(`~~~ Memory usage before getDiagnostics: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  const startTime = Date.now();
  const diagnostics = await getDiagnostics(paths);
  console.log(`~~~ getDiagnostics took ${(Date.now() - startTime) / 1000}s, Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  
  const diagnosticsWithFile = diagnostics.filter(
    d => !!d.file && !paths.exclude.some(e => d.file!.fileName.includes(e))
  );
  console.log(`~~~ After filtering diagnostics, Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  
  const diagnosticsGroupedByFile = groupBy(
    diagnosticsWithFile,
    d => d.file!.fileName
  );
  console.log(`~~~ After grouping diagnostics, Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB, File count: ${Object.keys(diagnosticsGroupedByFile).length}`);

  await Promise.all(Object.keys(diagnosticsGroupedByFile).map(async (fileName, i, arr) => {
    const fileDiagnostics = uniqBy(diagnosticsGroupedByFile[fileName], d =>
      d.file!.getLineAndCharacterOfPosition(d.start!)
    ).reverse();
    
    if (i % 50 === 0) {
      console.log(
        `${i + 1} of ${arr.length}: Ignoring ${
          fileDiagnostics.length
        } ts-error(s) in ${fileName}, Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
      );
    } else {
      console.log(
        `${i + 1} of ${arr.length}: Ignoring ${
          fileDiagnostics.length
        } ts-error(s) in ${fileName}`
      );
    }
    
    try {
      const filePath = getFilePath(paths, fileDiagnostics[0]);
      const fileContent = readFileSync(filePath, "utf8");
      
      const modifiedCodeSplitByLine = fileDiagnostics.reduce(
        (codeSplitByLine, diagnostic) =>
          insertIgnore(
            diagnostic,
            codeSplitByLine,
            includeJSX,
            paths.rootDir
          ),
        fileContent.split("\n")
      );
      
      const fileData = modifiedCodeSplitByLine.join("\n");
      writeFileSync(filePath, fileData);
      successFiles.push(fileName);
    } catch (e) {
      console.log(e);
      errorFiles.push(fileName);
    }
  }));

  console.log(`~~~ After processing all files, Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  
  if (shouldCommit) {
    await commit(":see_no_evil: ignore errors", paths);
  }

  console.log(`${successFiles.length} files with errors ignored successfully.`);

  const missingTypePackages = getMissingTypePackages();

  if (missingTypePackages.length > 0) {
    console.log(
      `Consider adding these package(s):\n${missingTypePackages.join(" ")}`
    );
  }

  if (errorFiles.length) {
    console.log(`Error handling ${errorFiles.length} files:`);
    console.log(errorFiles);
  }
}

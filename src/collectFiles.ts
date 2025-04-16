import fs from "fs";
import { promisify } from "util";
import { resolve } from "path";
import { FilePaths } from "cli";

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

async function getFiles(dir: string): Promise<string[]> {
  const startTime = Date.now();
  const subdirs = await readdir(dir);
  
  // Process directories in batches to avoid memory issues
  const batchSize = 50;
  const results: string[] = [];
  
  for (let i = 0; i < subdirs.length; i += batchSize) {
    const batch = subdirs.slice(i, i + batchSize);
    const batchFiles = await Promise.all(
      batch.map(async (subdir: string) => {
        const res = resolve(dir, subdir);
        try {
          const stats = await stat(res);
          return stats.isDirectory() ? getFiles(res) : res;
        } catch (err) {
          console.log(`~~~ Error processing ${res}: ${err}`);
          return [];
        }
      })
    );
    
    for (const files of batchFiles) {
      if (Array.isArray(files)) {
        results.push(...files);
      } else if (typeof files === 'string') {
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
}

export default async function collectFiles(paths: FilePaths) {
  console.log(`~~~ collectFiles started, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  const startTime = Date.now();
  
  const filesArr = await Promise.all(
    paths.include.map(async include => {
      console.log(`~~~ Processing include path: ${include}`);
      try {
        const isFile = (await stat(include)).isFile();
        return isFile ? [include] : await getFiles(include);
      } catch (err) {
        console.log(`~~~ Error processing include path ${include}: ${err}`);
        return [];
      }
    })
  );
  
  console.log(`~~~ All include paths processed, Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  
  // Flatten arrays carefully to avoid heap issues
  let files: string[] = [];
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
}

import { simpleGit } from "simple-git";
import { FilePaths } from "./cli";

export default async function commit(message: string, filePaths: FilePaths) {
  const git = simpleGit(filePaths.projectDir);
  console.log(`Committing: "${message}"`);
  try {
    await git.add(".");
  } catch (e) {
    console.log("error adding");
    throw new Error(e as any);
  }

  try {
    await git.commit(message, undefined, { "-n": "true" });
  } catch (e) {
    console.log("error committing");
    throw new Error(e as any);
  }
}

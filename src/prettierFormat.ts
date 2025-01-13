import * as prettier from "prettier";

export default async function prettierFormat(code: string, rootDir: string) {
  const prettierConfig = await prettier.resolveConfig(rootDir);
  return prettier.format(code, {
    ...prettierConfig,
    parser: "typescript"
  });
}

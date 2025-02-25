# Flow to TypeScript Migration Tools

These are a collection of tools that we used at Quizlet when migrating from Flow to TypeScript. We hope that you find these tools useful when doing your own migration, but keep in mind that they are made for the particularities of Quizlet's large codebase. You may need to modify these tools to suit your needs, but that said, they should be at the very least a good starting point.

The converter uses a fork of [babel-plugin-flow-to-typescript](https://github.com/rgoldfinger-quizlet/babel-plugin-flow-to-typescript) along with [Recast](https://github.com/benjamn/recast) to preserve formatting. As it runs, it will rename files to `.ts` (or `.tsx` if it contains React), along with any snaps. In order to preserve the git history, this runs the conversion and commits the changes, and then renames all the files in a separate commit.

## Installation

or add this in `devDependencies`:

```
"ts-migration": "git+https://github.com/datadotworld/ts-migration"
```

and run `npm install`.

### This tool assumes:

1. TypeScript is installed in your codebase, and you have a `tsconfig.json` configured to suit your needs.
2. You use prettier, and you have a `.prettierrc`.

## Commands:

Once installed, you can access the tools via the binary.

### Preview a conversion (without renaming files):

```
npx ts-migration convert-codebase
```

### Convert the codebase and rename files to `.ts[x]`:

```
npx ts-migration convert-codebase --commit
```

### Ignore all TypeScript errors:

```
npx ts-migration ignore-errors [--commit] [--includeJSX]
```

The `--includeJSX` option can be extremely useful when you have a lot of errors you want to ignore, but will insert ignore comments in such a way that they can appear in the rendered HTML, so be sure to carefully review the output!

### Strip Flow comments

```
npx ts-migration strip-comments [--commit]
```

# License

ts-migration is [MIT licensed](./LICENSE).

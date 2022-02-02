// @see https://github.com/storybookjs/storybook/blob/v6.4.14/addons/storyshots/storyshots-core/injectFileName.js#L12
import type {
  SyncTransformer,
  TransformedSource,
  TransformOptions,
} from "@jest/transform";
import type { Config } from "@jest/types";
import type { ProjectConfig } from "@jest/types/build/Config";

type TransformModuleName = string;
type Pattern = string;

type MatchTransform =
  | {
      kind: "match";
      pattern: Pattern;
      moduleName: TransformModuleName;
      options: Record<string, unknown>;
    }
  | {
      kind: "unMatch";
      fileName: string;
      transform: ProjectConfig["transform"];
    };

function findNextTransform(
  transform: ProjectConfig["transform"],
  fileName: string
): MatchTransform {
  const selfTransform = transform.find(([pattern]) =>
    new RegExp(pattern).test(fileName)
  );
  const transformExcludeSelf = transform.filter((t) => t !== selfTransform);
  const result = transformExcludeSelf.find(([pattern]) =>
    new RegExp(pattern).test(fileName)
  );
  return result
    ? {
        kind: "match",
        pattern: result[0],
        moduleName: result[1],
        options: result[2],
      }
    : { kind: "unMatch", fileName, transform };
}

function translate(fileName: string, code: string): string {
  return `${code};
if(exports.default != null) {
  exports.default.parameters = exports.default.parameters || {};
  exports.default.parameters.fileName = '${fileName}';
}
`;
}

function createTranslateParams(
  sourcePath: Config.Path,
  transformed: TransformedSource
): [string, string] {
  let code;
  if (typeof transformed === "string") {
    code = transformed;
  } else {
    code = transformed.code;
  }
  const fileName = sourcePath.replace(/\\/g, "\\\\");
  return [fileName, code];
}

/**
 * @see https://jestjs.io/docs/code-transformation
 */
export const injectFileName: SyncTransformer = {
  canInstrument: true,
  process: (
    sourceText: string,
    sourcePath: Config.Path,
    options: TransformOptions
  ) => {
    const transform = findNextTransform(options.config.transform, sourcePath);
    if (transform.kind === "unMatch") {
      throw transform;
    }
    // TODO support transform options for next TransFormer
    // TODO support createTransformer for next TransFormer
    const {
      default: { process },
      // need dynamic import, but sync process.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
    } = require(transform.moduleName);
    const processed = process(sourceText, sourcePath, options);
    const params = createTranslateParams(sourcePath, processed);
    return translate(...params);
  },
};

export default injectFileName;

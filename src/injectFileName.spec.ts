import type { TransformOptions } from "@jest/transform";
import { ProjectConfig, TransformerConfig } from "@jest/types/build/Config";
import { injectFileName } from "./injectFileName";

describe("injectFileName", () => {
  test("process", () => {
    jest.mock("babel-jest", () => {
      return {
        default: {
          process: jest.fn(() => "exports.default.title = 'sample'"),
        },
      };
    });

    const options: TransformOptions = {
      cacheFS: new Map<string, string>(),
      config: {
        transform: [
          ["^.+\\.stories\\.tsx?$", "@eiel/storyshot-jest-27", {}],
          ["^.+\\.[jt]sx?$", "babel-jest", {}],
        ],
      } as ProjectConfig,
      configString: "",
      transformerConfig: {},
      instrument: true,
    } as TransformOptions;
    const actual = injectFileName.process(
      "export.default = { component: Example }",
      "example.stories.ts",
      options
    );
    expect(actual).toStrictEqual(
      `exports.default.title = 'sample';
if(exports.default != null) {
  exports.default.parameters = exports.default.parameters || {};
  exports.default.parameters.fileName = 'example.stories.ts';
}
`
    );
  });
});

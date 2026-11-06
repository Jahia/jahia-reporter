import path from 'node:path';

import { JRRun } from '../../types/index.js';

// An error annotation of a step of GitHub Actions
export interface Annotation {
  file?: string;
  line?: number;
  message: string;
  title: string;
}

// The line of the last frame in the spec file, which is the line of the test itself
const getLine = (stack: string, file: string): number | undefined => {
  const escaped = file.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`);
  const frames = [...stack.matchAll(new RegExp(`${escaped}:(\\d+):\\d+`, 'g'))];
  return frames.length > 0 ? Number(frames.at(-1)?.[1]) : undefined;
};

// One annotation for each failed test. GitHub keeps a fixed number of error annotations for each
// step, so past maxAnnotations the last annotation counts the failed tests that have none.
export const getAnnotations = ({
  maxAnnotations,
  report,
  testsPath,
}: {
  maxAnnotations: number;
  report: JRRun;
  testsPath: string;
}): Annotation[] => {
  const annotations: Annotation[] = [];
  for (const jrReport of report.reports) {
    for (const suite of jrReport.testsuites) {
      for (const test of suite.tests.filter((t) => t.status === 'FAIL')) {
        annotations.push({
          file:
            suite.file === undefined
              ? undefined
              : path.posix.join(testsPath, suite.file),
          line:
            suite.file === undefined || test.error === undefined
              ? undefined
              : getLine(test.error.stack, suite.file),
          message: test.error?.message ?? '',
          // mocha-junit-reporter names a test by its full title, which starts with the name of its suite
          title: test.name.startsWith(suite.name)
            ? test.name
            : `${suite.name} > ${test.name}`,
        });
      }
    }
  }

  if (annotations.length <= maxAnnotations) {
    return annotations;
  }

  const kept = annotations.slice(0, maxAnnotations - 1);
  return [
    ...kept,
    {
      message: `${annotations.length - kept.length} more failed tests have no annotation`,
      title: 'Failed tests without annotation',
    },
  ];
};

// The escaping of @actions/core, for the message and for a property of a workflow command
const escapeData = (value: string): string =>
  value.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
const escapeProperty = (value: string): string =>
  escapeData(value).replaceAll(':', '%3A').replaceAll(',', '%2C');

// The workflow command that makes GitHub Actions show an error annotation
export const formatAnnotation = ({
  file,
  line,
  message,
  title,
}: Annotation): string => {
  const properties = Object.entries({ file, line, title })
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${escapeProperty(String(value))}`)
    .join(',');
  return `::error ${properties}::${escapeData(message)}`;
};

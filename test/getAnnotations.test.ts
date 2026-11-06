import * as path from 'node:path';

import ingestReport from '../src/utils/ingest/index.js';
import {
  formatAnnotation,
  getAnnotations,
} from '../src/utils/github/getAnnotations.js';

const log = (msg: string) => {
  console.log(msg);
};

describe('getAnnotations', () => {
  it('gives each failed test its message, its spec file under the tests path and the line of the test', async () => {
    const report = await ingestReport(
      'xml',
      path.resolve(__dirname, './assets/mocha-junit-failure'),
      log,
    );

    expect(
      getAnnotations({ maxAnnotations: 10, report, testsPath: 'tests' }),
    ).toEqual([
      {
        file: 'tests/cypress/e2e/jcontent/versionCopyField.cy.ts',
        line: 128,
        message:
          'Timed out retrying after 10000ms: Expected to find element: `[data-sel-role="right-column"]`, but never found it.',
        title: 'Version history offers the arrow',
      },
      {
        file: 'tests/cypress/e2e/jcontent/versionCopyField.cy.ts',
        line: undefined,
        message: "`cy.task('unzipArtifact')` failed with the following error:",
        title: 'Version history copies a datetime',
      },
    ]);
  });

  it('names a test after its suite when the name of the test leaves the suite out', async () => {
    const report = await ingestReport(
      'json',
      path.resolve(__dirname, './assets/single-json-failure'),
      log,
    );
    const [annotation] = getAnnotations({
      maxAnnotations: 10,
      report,
      testsPath: '',
    });

    expect(annotation).toEqual({
      file: 'cypress/integration/ui/profileCsvExport.spec.ts',
      // The frames of this stack name the bundle that Cypress serves, and no line of the spec
      line: undefined,
      message: expect.stringMatching(/^CypressError: `cy.task\('listFiles'\)` failed/),
      title: 'profile export in csv > export a set of profiles in csv',
    });
  });

  it('says that the report gives no error message, and gives no line, for a failed test whose error is empty', async () => {
    const report = await ingestReport(
      'json',
      path.resolve(__dirname, './assets/json-failure-no-stack'),
      log,
    );

    expect(
      getAnnotations({ maxAnnotations: 10, report, testsPath: '' }),
    ).toEqual([
      {
        file: 'cypress/e2e/gamma.cy.ts',
        line: undefined,
        message: 'The report gives no error message for this test',
        title: 'Gamma > fails with no error',
      },
    ]);
  });

  it('keeps the last annotation to count the failed tests beyond the maximum', async () => {
    const report = await ingestReport(
      'xml',
      path.resolve(__dirname, './assets/junit'),
      log,
    );
    const failed = report.reports
      .flatMap((r) => r.testsuites)
      .flatMap((s) => s.tests)
      .filter((t) => t.status === 'FAIL').length;
    const annotations = getAnnotations({
      maxAnnotations: 3,
      report,
      testsPath: '',
    });

    expect(annotations).toHaveLength(3);
    expect(annotations[2]).toEqual({
      message: `${failed - 2} more failed tests have no annotation`,
      title: 'Failed tests without annotation',
    });
  });

  it('annotates every failed test when they fit in the maximum', async () => {
    const report = await ingestReport(
      'xml',
      path.resolve(__dirname, './assets/mocha-junit-failure'),
      log,
    );

    expect(
      getAnnotations({ maxAnnotations: 2, report, testsPath: '' }).map(
        (annotation) => annotation.title,
      ),
    ).toEqual([
      'Version history offers the arrow',
      'Version history copies a datetime',
    ]);
  });
});

describe('formatAnnotation', () => {
  it('writes the workflow command of an error, with its properties and its message escaped', () => {
    expect(
      formatAnnotation({
        file: 'tests/cypress/e2e/a.cy.ts',
        line: 12,
        message: '50% done\nthen failed',
        title: 'Suite, case: one',
      }),
    ).toBe(
      '::error file=tests/cypress/e2e/a.cy.ts,line=12,title=Suite%2C case%3A one::50%25 done%0Athen failed',
    );
  });

  it('leaves out the properties that the annotation does not have', () => {
    expect(formatAnnotation({ message: 'm', title: 't' })).toBe(
      '::error title=t::m',
    );
  });
});

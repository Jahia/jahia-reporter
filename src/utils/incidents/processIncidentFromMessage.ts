import * as fs from 'node:fs';
import { v5 as uuidv5 } from 'uuid';

import { Incident } from '../../types/index.js';

// This processes an incident based on a message and optional details file
// This is an alternative to processing from a test report, it is especially useful
// for non-test related incidents (performance, build, sonar, ...)
export const processIncidentFromMessage = async ({
  dedupKeyMessage = '',
  incidentDetailsPath,
  message,
  service,
}: {
  dedupKeyMessage?: string;
  incidentDetailsPath: string;
  message: string;
  service: string;
}): Promise<Incident> => {
  const incidentMessage =
    message === '' ? 'Incident occurred (no error message provided)' : message;

  const incidentTitle = `${service} - ${incidentMessage}`;

  // The dedup key can be made from another message than the one reported, so that the run
  // reporting a recovery, with its own message, matches the issue of the failure
  const dedupKey = uuidv5(
    dedupKeyMessage === '' ? incidentTitle : `${service} - ${dedupKeyMessage}`,
    '92ca6951-5785-4d62-9f33-3512aaa91a9b',
  );

  let description = `${incidentMessage}`;
  if (incidentDetailsPath !== '' && fs.existsSync(incidentDetailsPath)) {
    const errorLogs = fs.readFileSync(incidentDetailsPath);
    description += `\n\n${errorLogs}`;
  }

  return {
    counts: {
      fail: 1,
      skip: 0,
      success: 0,
      total: 1,
    },
    dedupKey,
    description,
    service,
    sourceUrl: '',
    title: incidentTitle,
  };
};

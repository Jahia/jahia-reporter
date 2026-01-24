import * as fs from 'node:fs';
import { v5 as uuidv5 } from 'uuid';

import { Incident } from '../../types/index.js';

// This processes an incident based on a message and optional details file
// This is an alternative to processing from a test report, it is especially useful
// for non-test related incidents (performance, build, sonar, ...)
export const processIncidentFromMessage = async ({
  incidentDetailsPath,
  message,
  service,
}: {
  incidentDetailsPath: string;
  message: string;
  service: string;
}): Promise<Incident> => {
  const incidentMessage =
    message === '' ? 'Incident occurred (no error message provided)' : message;

  const incidentTitle = `${service} - ${incidentMessage}`;

  const dedupKey = uuidv5(
    incidentTitle,
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

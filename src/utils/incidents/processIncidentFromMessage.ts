import { v5 as uuidv5 } from 'uuid';
import * as fs from 'node:fs';

import { Incident } from '../../global.type';

export const processIncidentFromMessage = async ({
  service,
  message,
  incidentDetailsPath,
}: {
  service: string;
  message: string;
  incidentDetailsPath: string;
}): Promise<Incident> => {
  const incidentMessage =
    message !== '' ? message : 'Incident occurred (no error message provided)';

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
    dedupKey: dedupKey,
    title: incidentTitle,
    description: description,
    success: false,
    counts: {
      total: 1,
      fail: 1,
      success: 0,
      skip: 0,
    },
  };
};

export const getIncidentDescription = ({
  service,
  incidentMessage,
  dedupKey,
  incidentDetails,
  runUrl,
}: {
  service: string;
  incidentMessage: string;
  dedupKey: string;
  incidentDetails: string;
  runUrl?: string;
}): string => {
  let description = 'An error occurred during the test execution workflow.\n\n';

  if (incidentDetails && incidentDetails !== '') {
    description += `**Details:**\n\n${incidentDetails}\n\n\n`;
    return description;
  } else {
    description +=
      'No test output is available, please look into the provided link below or the repository workflows \n\n';
  }

  // Add custom incident message if provided
  if (incidentMessage) {
    description += `**Details:** ${incidentMessage}\n\n\n`;
  }

  // Add source URL if provided
  if (runUrl) {
    description += `**Source URL:** ${runUrl}\n`;
  }

  // Add incident service context
  if (service) {
    description += `**Service:** ${service}\n`;
  }

  // Add custom incident message if provided
  if (dedupKey) {
    description += `**Dedup Key:** ${dedupKey}\n`;
  }

  return description;
};

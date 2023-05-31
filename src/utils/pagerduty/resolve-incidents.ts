/* eslint-disable no-console */

import {sleep} from '../sleep'

export const resolveIncidents = async (
  pdClient: any,
  serviceId: string,
  testService: string,
  sourceUrl: string,
) => {
  const allIncidents = await pdClient.all(
    `/incidents?service_ids%5B%5D=${serviceId}&statuses%5B%5D=acknowledged&statuses%5B%5D=triggered`,
  )
  const allOpenIncidents = allIncidents.data
  .reduce((acc: any, i: any) => {
    if (i.incidents !== undefined && i.incidents.length > 0) {
      acc = [...acc, ...i.incidents]
    }
    return acc
  }, [])
  .filter((i: any) => i.title.split(' - Tests: ')[0] === testService)
  console.log(
    `${allOpenIncidents.length} incidents still open in pagerduty for service: ${testService}`,
  )
  if (allOpenIncidents.length > 0) {
    console.log('These incidents will be resolved')
  }
  for (const incident of allOpenIncidents) {
    // eslint-disable-next-line no-await-in-loop
    const incidentResponse = await pdClient.put(`/incidents/${incident.id}`, {
      data: {
        incident: {
          type: 'incident',
          status: 'resolved',
          resolution: `Incident was automatically resolved by jahia-reporter since the last run (${sourceUrl}) was successful`,
        },
      },
    })
    if (
      incidentResponse.data !== undefined &&
      incidentResponse.data.incident !== undefined
    ) {
      console.log(
        `Incident: ${incidentResponse.data.incident.incident_number} was resolved`,
      )
    } else {
      console.log(`Unable to resolve incident: ${incident.id}`)
    }
    // Sleep for 1s to avoid hitting pagerduty service limits
    sleep(1000)
  }
}

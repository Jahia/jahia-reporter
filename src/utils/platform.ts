import {Client} from '@urql/core'
import {graphql} from 'gql.tada'

export const getPlatform = async (client: Client) => {
  const response = await client.query(
    graphql(`
      query {
        admin {
          jahia {
            version {
              build
              buildDate
              isSnapshot
              release
            }
            database {
              type
              name
              version
              driverName
              driverVersion
            }
            system {
              os {
                name
                architecture
                version
              }
              java {
                runtimeName
                runtimeVersion
                vendor
                vendorVersion
              }
            }
          }
          cluster {
            isActivated
          }
        }
      }
    `),
    {},
  )
  if (response.data !== null && response.error === undefined) {
    console.log('Fetched full details about the platform')
    return response.data.admin
  }
}

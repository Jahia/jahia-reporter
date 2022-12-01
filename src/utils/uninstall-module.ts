import axios from 'axios'
import {exit} from '@oclif/errors'

const uninstallModule = async (
  jahiaUrl: string,
  jahiaUsername: string,
  jahiaPassword: string,
  moduleId: string,
  moduleVersion: string,
// eslint-disable-next-line max-params
) => {
  // If module is a snaphsot, the key is different than the version, with a . instead of a -
  let moduleKey: string = moduleId + '/' + moduleVersion
  if (moduleKey.includes('SNAPSHOT')) {
    moduleKey = moduleKey.replace('-SNAPSHOT', '.SNAPSHOT')
  }

  let installResponse: any = {}
  try {
    installResponse = await axios.post(jahiaUrl + 'modules/api/bundles/org.jahia.modules/' + moduleKey + '/_uninstall', null, {
      maxContentLength: Number.POSITIVE_INFINITY,
      maxBodyLength: Number.POSITIVE_INFINITY,
      auth: {
        username: jahiaUsername,
        password: jahiaPassword,
      },
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error)
    exit(1)
  }

  if (installResponse.data !== undefined) {
    return installResponse.data.bundleInfos
  }

  // eslint-disable-next-line no-console
  console.log(`Unable to uninstall module: ${JSON.stringify(installResponse)}`)
  exit(1)
}

export default uninstallModule

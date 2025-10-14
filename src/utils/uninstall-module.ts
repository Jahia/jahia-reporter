import axios from 'axios'

interface BundleInfo {
  [key: string]: unknown
}

const uninstallModule = async (
  jahiaUrl: string,
  jahiaUsername: string,
  jahiaPassword: string,
  moduleId: string,
  moduleVersion: string,
// eslint-disable-next-line max-params
): Promise<BundleInfo> => {
  // If module is a snaphsot, the key is different than the version, with a . instead of a -
  let moduleKey: string = moduleId + '/' + moduleVersion
  if (moduleKey.includes('SNAPSHOT')) {
    moduleKey = moduleKey.replace('-SNAPSHOT', '.SNAPSHOT')
  }
  let installResponse: {data?: {bundleInfos?: BundleInfo}} = {}
  try {
    installResponse = await axios.post(jahiaUrl + 'modules/api/bundles/org.jahia.modules/' + moduleKey + '/_uninstall', null, {
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      auth: {
        username: jahiaUsername,
        password: jahiaPassword,
      },
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error)
    process.exit(1)
  }
  if (installResponse.data?.bundleInfos !== undefined) {
    return installResponse.data.bundleInfos
  }
  // eslint-disable-next-line no-console
  console.log(`Unable to uninstall module: ${JSON.stringify(installResponse)}`)
  process.exit(1)
}

export default uninstallModule

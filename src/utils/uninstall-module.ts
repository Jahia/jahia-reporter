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
      auth: {
        password: jahiaPassword,
        username: jahiaUsername,
      },
      maxBodyLength: Number.POSITIVE_INFINITY,
      maxContentLength: Number.POSITIVE_INFINITY,
    })
  } catch (error) {
    console.log(error)
    process.exit(1)
  }

  if (installResponse.data?.bundleInfos !== undefined) {
    return installResponse.data.bundleInfos
  }

  console.log(`Unable to uninstall module: ${JSON.stringify(installResponse)}`)
  process.exit(1)
}

export default uninstallModule

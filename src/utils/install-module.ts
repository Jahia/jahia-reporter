import axios from 'axios'
import * as FormData from 'form-data'
import * as fs from 'fs'

interface BundleInfo {
  [key: string]: unknown
}

const installModule = async (
  jahiaUrl: string,
  jahiaUsername: string,
  jahiaPassword: string,
  moduleFile: string,
): Promise<BundleInfo> => {
  const form = new FormData()
  const stream = fs.createReadStream(moduleFile)
  form.append('bundle', stream)
  form.append('start', 'true')

  // In Node.js environment you need to set boundary in the header field 'Content-Type' by calling method `getHeaders`
  const formHeaders = form.getHeaders()

  let installResponse: {data?: {bundleInfos?: BundleInfo}} = {}
  try {
    installResponse = await axios.post(jahiaUrl + 'modules/api/bundles', form, {
      headers: {
        ...formHeaders,
      },
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
  console.log(`Unable to install module: ${JSON.stringify(installResponse)}`)
  process.exit(1)
}

export default installModule

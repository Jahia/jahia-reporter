import axios from 'axios'
import * as FormData from 'form-data'
import * as fs from 'node:fs'

import {exit} from '@oclif/errors'

const installModule = async (
  jahiaUrl: string,
  jahiaUsername: string,
  jahiaPassword: string,
  moduleFile: string,
) => {
  const form = new FormData()
  const stream = fs.createReadStream(moduleFile)
  form.append('bundle', stream)
  form.append('start', 'true')

  // In Node.js environment you need to set boundary in the header field 'Content-Type' by calling method `getHeaders`
  const formHeaders = form.getHeaders()

  let installResponse: any = {}
  try {
    installResponse = await axios.post(jahiaUrl + 'modules/api/bundles', form, {
      headers: {
        ...formHeaders,
      },
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
  console.log(`Unable to install module: ${JSON.stringify(installResponse)}`)
  exit(1)
}

export default installModule

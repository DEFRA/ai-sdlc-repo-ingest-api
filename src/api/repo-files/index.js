import { repoFilesController } from '~/src/api/repo-files/controllers/index.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const repoFiles = {
  plugin: {
    name: 'repo-files',
    register: (server) => {
      server.route([
        {
          method: 'POST',
          path: '/api/v1/repo-files',
          ...repoFilesController
        }
      ])
    }
  }
}

export { repoFiles }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */

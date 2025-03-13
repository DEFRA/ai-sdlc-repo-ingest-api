import { repoIngestController } from '~/src/api/repo-ingest/controllers/index.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const repoIngest = {
  plugin: {
    name: 'repo-ingest',
    register: (server) => {
      server.route([
        {
          method: 'POST',
          path: '/api/v1/repo-ingest',
          ...repoIngestController
        }
      ])
    }
  }
}

export { repoIngest }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */

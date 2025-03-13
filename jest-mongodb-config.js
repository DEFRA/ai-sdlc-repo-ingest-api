/* eslint-env node */
/* eslint-disable no-undef */

module.exports = {
  mongodbMemoryServerOptions: {
    binary: {
      version: '4.0.3',
      skipMD5: true
    },
    instance: {
      dbName: 'ai-sdlc-repo-ingest-api'
    },
    autoStart: false
  },
  mongoURLEnvName: 'MONGO_URI',
  useSharedDBForAllJestWorkers: false
}

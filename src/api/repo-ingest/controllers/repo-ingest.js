import Joi from 'joi'
import { executeRepomix } from '~/src/api/repo-ingest/helpers/execute-repomix.js'
import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import Boom from '@hapi/boom'

/**
 * Repository ingestion controller
 * Process a GitHub repository URL using repomix
 * @satisfies {Partial<ServerRoute>}
 */
const repoIngestController = {
  options: {
    validate: {
      payload: Joi.object({
        repository_url: Joi.string()
          .uri()
          .required()
          .description('GitHub repository URL'),
        compress: Joi.boolean()
          .description('Whether to compress the code to reduce token count')
          .default(false),
        remove_comments: Joi.boolean()
          .description('Whether to remove comments from the code')
          .default(false),
        remove_empty_lines: Joi.boolean()
          .description('Whether to remove empty lines from the code')
          .default(false)
      }).required(),
      failAction: (request, h, err) => {
        throw Boom.badRequest(`Validation error: ${err.message}`)
      }
    }
  },
  handler: async (request, h) => {
    try {
      const { repository_url, compress, remove_comments, remove_empty_lines } =
        request.payload

      const options = {
        compress,
        removeComments: remove_comments,
        removeEmptyLines: remove_empty_lines
      }

      const result = await executeRepomix(repository_url, options)

      return h
        .response({
          message: 'Repository successfully processed',
          data: result
        })
        .code(statusCodes.ok)
    } catch (error) {
      request.log(['error'], `Error processing repository: ${error.message}`)

      if (error.isBoom) {
        throw error
      }

      throw Boom.badImplementation(
        'An error occurred while processing the repository'
      )
    }
  }
}

export { repoIngestController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */

import Joi from 'joi'
import { executeRepomix } from '~/src/api/repo-ingest/helpers/execute-repomix.js'
import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import Boom from '@hapi/boom'

/**
 * Repository files controller
 * Process a GitHub repository URL and specific file paths using repomix
 * @satisfies {Partial<ServerRoute>}
 */
const repoFilesController = {
  options: {
    validate: {
      payload: Joi.object({
        repositoryUrl: Joi.string()
          .uri()
          .required()
          .description('GitHub repository URL'),
        filePaths: Joi.string()
          .required()
          .description('Comma-delimited string of file paths to include')
      }).required(),
      failAction: (request, h, err) => {
        throw Boom.badRequest(`Validation error: ${err.message}`)
      }
    }
  },
  handler: async (request, h) => {
    try {
      const { repositoryUrl, filePaths } = request.payload

      // Configure options for repomix execution
      const options = {
        // Set fixed configuration options as required by PRD
        compress: false,
        removeComments: false,
        removeEmptyLines: false,
        include: filePaths // Pass filePaths directly to include option
      }

      // Execute repomix with the repository URL and options
      const result = await executeRepomix(repositoryUrl, options)

      // Return the raw XML content directly in the response
      return h
        .response(result.content)
        .type('application/xml')
        .code(statusCodes.ok)
    } catch (error) {
      request.log(
        ['error'],
        `Error processing repository files: ${error.message}`
      )

      if (error.isBoom) {
        throw error
      }

      throw Boom.badImplementation(
        'An error occurred while processing the repository files'
      )
    }
  }
}

export { repoFilesController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */

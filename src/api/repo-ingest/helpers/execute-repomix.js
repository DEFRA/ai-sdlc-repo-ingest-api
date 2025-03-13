import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import Boom from '@hapi/boom'

// Calculate the project root directory path using current working directory
// This works in both ES modules and CommonJS environments
const projectRoot = process.cwd()

/**
 * Creates a repomix configuration file for the specified repository and output path
 * @param {string} repositoryUrl - The GitHub repository URL
 * @param {string} outputFile - The output file path
 * @returns {Promise<string>} Path to the created configuration file
 */
async function createRepomixConfig(repositoryUrl, outputFile) {
  // Create a configuration object based on repomix.config.json structure
  const config = {
    output: {
      filePath: outputFile,
      style: 'plain', // Use plain text format for API processing
      parsableStyle: false,
      compress: false, // Don't compress code by default
      fileSummary: true,
      directoryStructure: true,
      removeComments: false,
      removeEmptyLines: false,
      showLineNumbers: true,
      copyToClipboard: false,
      includeEmptyDirectories: false
    },
    include: ['**/*'],
    ignore: {
      useGitignore: true,
      useDefaultPatterns: true,
      customPatterns: []
    },
    security: {
      enableSecurityCheck: false // Disable security check for API usage
    }
  }

  // Create a unique config file for this run
  const uniqueId = randomUUID()
  const configDir = '/tmp/repomix-config'
  await fs.mkdir(configDir, { recursive: true })

  const configFile = path.join(configDir, `repomix-config-${uniqueId}.json`)
  await fs.writeFile(configFile, JSON.stringify(config, null, 2))

  return configFile
}

/**
 * Execute repomix with a repository URL
 * @param {string} repositoryUrl - The GitHub repository URL
 * @param {object} options - Additional options
 * @param {boolean} options.compress - Whether to compress the code to reduce token count
 * @param {boolean} options.removeComments - Whether to remove comments from the code
 * @param {boolean} options.removeEmptyLines - Whether to remove empty lines from the code
 * @returns {Promise<{outputPath: string, content: string}>} The result of the repomix execution
 * @throws {Error} If there's an error during execution
 */
export const executeRepomix = async (repositoryUrl, options = {}) => {
  // Validate the repository URL to ensure it's a GitHub URL
  if (!isValidGitHubUrl(repositoryUrl)) {
    throw Boom.badRequest('Invalid GitHub repository URL')
  }

  // Create a temporary directory for output - use a simple path to avoid issues
  const tempDir = '/tmp/repomix-output'
  const uniqueId = randomUUID()
  const outputFile = path.join(tempDir, `repomix-output-${uniqueId}.txt`)

  // Ensure the directory exists by creating it (doesn't error if it already exists)
  try {
    await fs.mkdir(tempDir, { recursive: true })

    // Create an empty file to ensure the path exists and is writable
    await fs.writeFile(outputFile, '')

    // Verify the file is writable
    await fs.access(outputFile, fs.constants.W_OK)
  } catch (error) {
    throw new Error(`Cannot prepare output path: ${error.message}`)
  }

  // Create a repomix configuration file
  const configFile = await createRepomixConfig(repositoryUrl, outputFile)

  // Update the configuration with user options if provided
  if (Object.keys(options).length > 0) {
    const config = JSON.parse(await fs.readFile(configFile, 'utf-8'))

    if (options.compress !== undefined) {
      config.output.compress = options.compress
    }

    if (options.removeComments !== undefined) {
      config.output.removeComments = options.removeComments
    }

    if (options.removeEmptyLines !== undefined) {
      config.output.removeEmptyLines = options.removeEmptyLines
    }

    await fs.writeFile(configFile, JSON.stringify(config, null, 2))
  }

  // Execute repomix using npm script
  await new Promise((resolve, reject) => {
    // Use npm run repomix to execute from package.json script
    const repomixArgs = [
      '--remote',
      repositoryUrl,
      '--config',
      configFile,
      '--verbose'
    ]

    const repomixProcess = spawn(
      'npm',
      ['run', 'repomix', '--', ...repomixArgs],
      {
        cwd: projectRoot
      }
    )

    // Fix the unused variable issue by collecting stderr only
    let stderr = ''

    repomixProcess.stdout.on('data', () => {
      // Just consume the data without storing it
    })

    repomixProcess.stderr.on('data', (data) => {
      const chunk = data.toString()
      stderr += chunk
    })

    repomixProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Repomix exited with code ${code}: ${stderr}`))
      }
      resolve()
    })

    repomixProcess.on('error', (error) => {
      reject(new Error(`Failed to execute repomix: ${error.message}`))
    })

    // Set a timeout for the process
    const timeout = setTimeout(
      () => {
        repomixProcess.kill()
        reject(new Error('Repomix process timed out after 5 minutes'))
      },
      5 * 60 * 1000
    ) // 5 minutes timeout

    repomixProcess.on('close', () => clearTimeout(timeout))
  })

  // Verify the file exists and has content
  try {
    const stats = await fs.stat(outputFile)

    if (stats.size === 0) {
      throw new Error('Repomix generated an empty output file')
    }
  } catch (error) {
    throw new Error(`Output file issue: ${error.message}`)
  }

  // Read the generated file
  const content = await fs.readFile(outputFile, 'utf-8')

  return {
    outputPath: outputFile,
    content
  }
}

/**
 * Validate if the URL is a valid GitHub repository URL
 * @param {string} url - The URL to validate
 * @returns {boolean} Whether the URL is valid
 */
function isValidGitHubUrl(url) {
  try {
    const parsedUrl = new URL(url)

    // Check if it's a GitHub URL
    if (!['github.com', 'www.github.com'].includes(parsedUrl.hostname)) {
      return false
    }

    // Basic path validation - GitHub repository URLs typically have at least 2 path segments (username/repo)
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean)
    return pathParts.length >= 2
  } catch (error) {
    return false
  }
}

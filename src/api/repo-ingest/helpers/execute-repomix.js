import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import Boom from '@hapi/boom'
import { fileURLToPath } from 'node:url'

// Calculate the project root directory path
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../../../..')

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

  console.log(`Created repomix config at: ${configFile}`)
  return configFile
}

/**
 * Execute repomix with a repository URL
 * @param {string} repositoryUrl - The GitHub repository URL
 * @param {Object} [options={}] - Additional options
 * @param {boolean} [options.compress=false] - Whether to compress the code to reduce token count
 * @param {boolean} [options.removeComments=false] - Whether to remove comments from the code
 * @param {boolean} [options.removeEmptyLines=false] - Whether to remove empty lines from the code
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

  console.log(`Creating repomix output at: ${outputFile}`)

  // Ensure the directory exists by creating it (doesn't error if it already exists)
  try {
    await fs.mkdir(tempDir, { recursive: true })
    console.log(`Created directory: ${tempDir}`)

    // Create an empty file to ensure the path exists and is writable
    await fs.writeFile(outputFile, '')
    console.log(`Created empty file: ${outputFile}`)

    // Verify the file is writable
    await fs.access(outputFile, fs.constants.W_OK)
    console.log(`File ${outputFile} exists and is writable`)
  } catch (error) {
    console.error(`Error preparing output path: ${error.message}`)
    throw new Error(`Cannot prepare output path: ${error.message}`)
  }

  try {
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
      console.log('Updated repomix config with user options')
    }

    // Execute repomix using npm script
    console.log(`Executing repomix for repository: ${repositoryUrl}`)
    await new Promise((resolve, reject) => {
      // Use npm run repomix to execute from package.json script
      const repomixArgs = [
        '--remote',
        repositoryUrl,
        '--config',
        configFile,
        '--verbose'
      ]

      console.log(`Running: npm run repomix -- ${repomixArgs.join(' ')}`)
      const repomixProcess = spawn(
        'npm',
        ['run', 'repomix', '--', ...repomixArgs],
        {
          cwd: projectRoot
        }
      )

      let stdout = ''
      let stderr = ''

      repomixProcess.stdout.on('data', (data) => {
        const chunk = data.toString()
        stdout += chunk
        console.log(`repomix stdout: ${chunk}`)
      })

      repomixProcess.stderr.on('data', (data) => {
        const chunk = data.toString()
        stderr += chunk
        console.log(`repomix stderr: ${chunk}`)
      })

      repomixProcess.on('close', (code) => {
        console.log(`repomix process exited with code ${code}`)
        if (code !== 0) {
          return reject(
            new Error(`Repomix exited with code ${code}: ${stderr}`)
          )
        }
        resolve()
      })

      repomixProcess.on('error', (error) => {
        console.error(`Failed to execute repomix: ${error.message}`)
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
      console.log(
        `Output file ${outputFile} exists with size: ${stats.size} bytes`
      )

      if (stats.size === 0) {
        console.error('Output file exists but is empty')
        throw new Error('Repomix generated an empty output file')
      }
    } catch (error) {
      console.error(`Error checking output file: ${error.message}`)
      throw new Error(`Output file issue: ${error.message}`)
    }

    // Read the generated file
    console.log(`Reading output file: ${outputFile}`)
    const content = await fs.readFile(outputFile, 'utf-8')
    console.log(
      `Successfully read content, length: ${content.length} characters`
    )

    return {
      outputPath: outputFile,
      content
    }
  } catch (error) {
    console.error(`Error in executeRepomix: ${error.message}`)
    // We don't clean up the temp directory anymore since we're using a fixed path
    throw error
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

# Product Requirements Document: `/api/v1/repo-files` Endpoint

## Context

The purpose of this project is to extend an existing Node.js API by adding a new POST endpoint at `/api/v1/repo-files`. This endpoint will accept a JSON payload containing a GitHub repository URL and a comma-delimited list of file paths. The endpoint will then utilize the Repomix library (via the existing helper `execute-repomix.js`) to fetch an XML representation of the specified files. The resulting XML output will be returned as the raw response of the API call.

## Data Model Reference

- **repository_url**: *string*  
  The URL of the GitHub repository from which files are to be processed.

- **file_paths**: *string*  
  A comma-delimited string of file paths that will be passed directly to the Repomix helper. The helper uses these file paths as an include filter.

## Feature and User Story Breakdown

### Feature 1: New `/api/v1/repo-files` API Endpoint

**Overview:**  
Implement a new POST endpoint that accepts a JSON payload containing `repository_url` and `file_paths`. The endpoint will build a configuration object, invoke the Repomix helper, and return its raw XML output.

#### Story 1.1: Backend API – Endpoint Creation

- **Story Title:** Implement POST `/api/v1/repo-files` endpoint  
- **Type:** Backend API story  
- **User Story:**  
  **As a** backend developer,  
  **I want** to create a new POST endpoint at `/api/v1/repo-files` that accepts a JSON payload with `repository_url` and `file_paths`,  
  **so that** clients can submit repository data for XML conversion via the Repomix helper.
- **Design / UX Consideration:**  
  The endpoint should follow RESTful design principles, returning standard HTTP status codes. It must also validate incoming data and use proper error handling.
- **Testable Acceptance Criteria:**  
  - **Given** a valid JSON payload containing `repository_url` and `file_paths`,  
    **When** a POST request is made to `/api/v1/repo-files`,  
    **Then** the endpoint should respond with HTTP 200 and return the raw XML output from the Repomix helper.
  
  - **Given** an invalid or missing payload,  
    **When** a POST request is made,  
    **Then** the endpoint should return an HTTP error status (e.g., 400 Bad Request) with a meaningful error message.
- **Detailed Architecture Design Notes:**  
  - Use Express.js (or the existing Node.js framework) to define the POST route.  
  - Validate that the `repository_url` is a well-formed URL and that `file_paths` is a non-empty comma-delimited string.  
  - Utilize middleware for JSON parsing and error handling.  
  - Ensure the endpoint remains stateless and directly returns the output from the Repomix helper.

#### Story 1.2: Backend API – Configuration Initialization and Repomix Invocation

- **Story Title:** Configure and invoke Repomix helper  
- **Type:** Backend API story  
- **User Story:**  
  **As a** backend developer,  
  **I want** to initialize the Repomix configuration using the provided `file_paths` and call the `executeRepomix` function with the `repository_url`,  
  **so that** the API processes the repository files and returns an XML representation.
- **Design / UX Consideration:**  
  The configuration object must be dynamically generated to include the user-specified file paths. The output file (if used) should be managed appropriately—either stored temporarily or streamed back as part of the response.
- **Testable Acceptance Criteria:**  
  - **Given** a POST request with valid input,  
    **When** the API builds the configuration object,  
    **Then** it should set the `include` key to an array containing the comma-delimited file paths exactly as received, and the rest of the configuration should match the specified options.
  
  - **Given** the configuration object is correctly initialized,  
    **When** the `executeRepomix` helper is invoked with the repository URL and configuration,  
    **Then** it should return a valid XML output that is forwarded as the API response.
- **Detailed Architecture Design Notes:**  
  - Create a configuration object as follows (ensuring proper management of the output file):
    ```javascript
    const config = {
      output: {
        filePath: outputFile,
        style: 'xml',
        parsableStyle: false,
        compress: false,
        fileSummary: false,
        directoryStructure: true,
        removeComments: false,
        removeEmptyLines: false,
        showLineNumbers: false,
        copyToClipboard: false,
        includeEmptyDirectories: false
      },
      include: [file_paths], // file_paths passed directly from the request payload
      ignore: {
        useGitignore: true,
        useDefaultPatterns: true,
        customPatterns: []
      },
      security: {
        enableSecurityCheck: false // Disabled for API usage
      }
    }
    ```
  - Ensure that the file paths are injected exactly as provided without any additional modifications.
  - Implement robust error handling for the `executeRepomix` call to capture and report any issues.

## Verification and Completion

- All defined features strictly adhere to the provided requirements: a new POST endpoint that accepts `repository_url` and `file_paths`, the initialization of the Repomix configuration, invoking the `executeRepomix` helper, and returning the raw XML output.
- The document now only includes backend stories, focusing solely on the API functionality.
- Dependencies and acceptance criteria have been clearly outlined to ensure correct implementation without ambiguity.
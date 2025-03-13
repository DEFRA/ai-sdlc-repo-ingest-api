# ai-sdlc-repo-ingest-api

Core delivery platform Node.js Backend Template.

- [Requirements](#requirements)
  - [Node.js](#nodejs)
- [Local development](#local-development)
  - [Setup](#setup)
  - [Development](#development)
  - [Testing](#testing)
  - [Production](#production)
  - [Npm scripts](#npm-scripts)
  - [Update dependencies](#update-dependencies)
  - [Formatting](#formatting)
    - [Windows prettier issue](#windows-prettier-issue)
- [API endpoints](#api-endpoints)
- [Development helpers](#development-helpers)
  - [MongoDB Locks](#mongodb-locks)
- [Docker](#docker)
  - [Development image](#development-image)
  - [Production image](#production-image)
  - [Docker Compose](#docker-compose)
  - [Dependabot](#dependabot)
  - [SonarCloud](#sonarcloud)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Requirements

### Node.js

Please install [Node.js](http://nodejs.org/) `>= v18` and [npm](https://nodejs.org/) `>= v9`. You will find it
easier to use the Node Version Manager [nvm](https://github.com/creationix/nvm)

To use the correct version of Node.js for this application, via nvm:

```bash
cd ai-sdlc-repo-ingest-api
nvm use
```

## Local development

### Setup

Install application dependencies:

```bash
npm install
```

### Development

To run the application in `development` mode run:

```bash
npm run dev
```

### Testing

To test the application run:

```bash
npm run test
```

### Production

To mimic the application running in `production` mode locally run:

```bash
npm start
```

### Npm scripts

All available Npm scripts can be seen in [package.json](./package.json).
To view them in your command line run:

```bash
npm run
```

### Update dependencies

To update dependencies use [npm-check-updates](https://github.com/raineorshine/npm-check-updates):

> The following script is a good start. Check out all the options on
> the [npm-check-updates](https://github.com/raineorshine/npm-check-updates)

```bash
ncu --interactive --format group
```

### Formatting

#### Windows prettier issue

If you are having issues with formatting of line breaks on Windows update your global git config by running:

```bash
git config --global core.autocrlf false
```

## API endpoints

| Endpoint                    | Description                    |
| :-------------------------- | :----------------------------- |
| `GET: /health`              | Health                         |
| `GET: /example`             | Example API (remove as needed) |
| `GET: /example/<id>`        | Example API (remove as needed) |
| `POST: /api/v1/repo-ingest` | Repository ingestion API       |

### Repository Ingestion API

The repo-ingest API endpoint allows users to process GitHub repositories using the repomix tool.

#### Request

```
POST /api/v1/repo-ingest
Content-Type: application/json

{
  "repository_url": "https://github.com/username/repository",
  "compress": false,
  "remove_comments": false,
  "remove_empty_lines": false
}
```

| Field              | Type    | Description                                    | Required | Default |
| ------------------ | ------- | ---------------------------------------------- | -------- | ------- |
| repository_url     | string  | The URL of the GitHub repository               | Yes      | -       |
| compress           | boolean | Whether to compress code to reduce token count | No       | false   |
| remove_comments    | boolean | Whether to remove comments from the code       | No       | false   |
| remove_empty_lines | boolean | Whether to remove empty lines from the code    | No       | false   |

#### Response

**Success Response**

```json
{
  "message": "Repository successfully processed",
  "data": {
    "outputPath": "/path/to/output/file.txt",
    "content": "Repository content in repomix format"
  }
}
```

**Error Response**

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation error: repository_url is required"
}
```

#### Example Usage

```bash
# Basic usage
curl -X POST \
  http://localhost:3555/api/v1/repo-ingest \
  -H "Content-Type: application/json" \
  -d '{"repository_url": "https://github.com/DEFRA/find-ffa-data-ingester"}'

# With compression and comment removal
curl -X POST \
  http://localhost:3555/api/v1/repo-ingest \
  -H "Content-Type: application/json" \
  -d '{
    "repository_url": "https://github.com/DEFRA/find-ffa-data-ingester",
    "compress": true,
    "remove_comments": true
  }'
```

#### Implementation Details

This endpoint uses the [repomix](https://github.com/yamadashy/repomix) tool to process GitHub repositories. The tool is executed as a child process with the `--remote` option to process remote repositories. A dynamically generated configuration file is used to customize the repomix behavior based on the API request parameters.

For more details on the available configuration options, see the [repomix configuration documentation](https://repomix.com/guide/configuration).

## Development helpers

### MongoDB Locks

If you require a write lock for Mongo you can acquire it via `server.locker` or `request.locker`:

```javascript
async function doStuff(server) {
  const lock = await server.locker.lock('unique-resource-name')

  if (!lock) {
    // Lock unavailable
    return
  }

  try {
    // do stuff
  } finally {
    await lock.free()
  }
}
```

Keep it small and atomic.

You may use **using** for the lock resource management.
Note test coverage reports do not like that syntax.

```javascript
async function doStuff(server) {
  await using lock = await server.locker.lock('unique-resource-name')

  if (!lock) {
    // Lock unavailable
    return
  }

  // do stuff

  // lock automatically released
}
```

Helper methods are also available in `/src/helpers/mongo-lock.js`.

### Proxy

We are using forward-proxy which is set up by default. To make use of this: `import { fetch } from 'undici'` then because of the `setGlobalDispatcher(new ProxyAgent(proxyUrl))` calls will use the ProxyAgent Dispatcher

If you are not using Wreck, Axios or Undici or a similar http that uses `Request`. Then you may have to provide the proxy dispatcher:

To add the dispatcher to your own client:

```javascript
import { ProxyAgent } from 'undici'

return await fetch(url, {
  dispatcher: new ProxyAgent({
    uri: proxyUrl,
    keepAliveTimeout: 10,
    keepAliveMaxTimeout: 10
  })
})
```

## Docker

### Development image

Build:

```bash
docker build --target development --no-cache --tag ai-sdlc-repo-ingest-api:development .
```

Run:

```bash
docker run -e PORT=3001 -p 3001:3001 ai-sdlc-repo-ingest-api:development
```

### Production image

Build:

```bash
docker build --no-cache --tag ai-sdlc-repo-ingest-api .
```

Run:

```bash
docker run -e PORT=3001 -p 3001:3001 ai-sdlc-repo-ingest-api
```

### Docker Compose

A local environment with:

- Localstack for AWS services (S3, SQS)
- Redis
- MongoDB
- This service.
- A commented out frontend example.

```bash
docker compose up --build -d
```

### Dependabot

We have added an example dependabot configuration file to the repository. You can enable it by renaming
the [.github/example.dependabot.yml](.github/example.dependabot.yml) to `.github/dependabot.yml`

### SonarCloud

Instructions for setting up SonarCloud can be found in [sonar-project.properties](./sonar-project.properties)

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.

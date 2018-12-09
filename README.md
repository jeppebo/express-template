# NodeJS Express Template

This template can be used for developing server applications with NodeJS and Express. It includes the following features:

* User Management
* In-Memory Database interface (Redis)
* Graph-based Database interface (ArangoDB)
* Input Validation
* Amazon Web Service interface
* Logging
* Error Handling

## Dependencies
* [NVM](https://github.com/creationix/nvm): To manage node and npm versions.
* [ArangoDB](https://www.arangodb.com/download/): To test with a local database.
* [Redis](https://redis.io/download): To save sessions and other data to a local in-memory cache.

To install the dependencies and run the server, you need to install NodeJS and NPM as well. With NVM the necessary versions can be easily installed:

`nvm install v8.10.0`

Make sure that you use this version before running the server:

`nvm use v8.10.0`

Or make it your default version:

`nvm alias default v8.10.0`

With this command, NodeJS v8.10.0 gets installed as well as NPM version with the matching version.

> Note that the versions for NodeJS and Redis should match the versions supported by AWS. See the supported [NodeJS](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/concepts.platforms.html#concepts.platforms.nodejs) and [Redis](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/supported-engine-versions.html) versions.

## Getting Started
After installing the above-mentioned dependencies, run:

> npm install

For the backend to run successfully, a configuration file needs to be provided. This file specifies the database connection, AWS credentials and a session key. 

Create a `.env` file with the following properties in the root folder of the project:

```
DB_HOST=...
DB_PORT=...
DB_NAME=...
DB_USER=...
DB_PASS=...

AWS_SECRET_KEY=...
AWS_ACCESS_KEY=...

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

FACEBOOK_CLIENT_ID=...
FACEBOOK_CLIENT_SECRET=...

DOMAIN=localhost
URL=http://localhost:1928

SESSION_SECRET=...

NODE_ENV=...
```

To generate a secure session key (on Linux), run:

> head -c16 /dev/urandom | base64

Use the resulting string as session key.

Make sure to start redis before running the backend:

> redis-server

Then start the backend independently without a built client, run:

> yarn dev

or to start the backend with a build client locally, run:

> yarn test

## Style Guide

The code for this repository follows the [AirBnb JavaScript style guide](https://github.com/airbnb/javascript).

## Security Check

To check if the used packages have any security vulnerabilities, run:

> npm run check

The security checks includes the services [nsp](https://www.npmjs.com/package/nsp) and [snyk](https://snyk.io/). For snyk to run, you need to authenticate first:

> snyk auth



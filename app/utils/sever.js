import fastify from 'fastify';
import postgres from '@fastify/postgres';
import eventProcessPlugin from './eventProcess.js';
import locateMapPlugin from './locateMap.js';
import S3Plugin from './S3.js';

export function createServer() {
  const app = fastify({
    logger: true,
  });

  const {
    POSTGRESQL_HOST,
    POSTGRESQL_USER,
    POSTGRESQL_DATABASE,
    POSTGRESQL_PASSWORD,
    POSTGRESQL_PORT,
    AWS_REGION: region,
    USER_ACCESS_KEY: accessKey,
    USER_SECRET_ACCESS_KEY: secretKey,
  } = process.env;

  const ssl = {
    rejectUnauthorized: false, // Set to false if you want to bypass server certificate validation
  };

  const connectionString = `postgresql://${POSTGRESQL_USER}:${POSTGRESQL_PASSWORD}@${POSTGRESQL_HOST}:${POSTGRESQL_PORT}/${POSTGRESQL_DATABASE}`;

  app.register(postgres, { connectionString, ssl });
  app.register(S3Plugin, { region, accessKey, secretKey });
  app.register(eventProcessPlugin);
  app.register(locateMapPlugin);
  return app;
}

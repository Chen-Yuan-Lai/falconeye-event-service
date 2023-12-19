import { S3Client } from '@aws-sdk/client-s3';
import fp from 'fastify-plugin';

const S3Plugin = fp(async (fastity, options) => {
  const { region, accessKey, secretKey } = options;

  const s3Client = new S3Client({
    region: region,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
  });

  fastity.decorate('s3', s3Client);
});

export default S3Plugin;

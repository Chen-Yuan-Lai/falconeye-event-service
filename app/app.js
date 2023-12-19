import 'dotenv/config.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { createServer } from './utils/sever.js';
import { disconnectConsumer, connectConsumer } from './utils/kafka.js';
import { createEvent, getNewestSourceMap, createCodeBlocks, createRequestInfo } from './utils/event.js';

const PORT = process.env.PORT;

async function gracefulShutdown(app) {
  console.log('Graceful shutdown');

  await app.close();
  await disconnectConsumer();

  process.exit(1);
}

async function main() {
  const app = await createServer();
  const emitter = await connectConsumer('eventData');
  console.log(process.env.KAFKA_BROKER);
  emitter.on('eventData', async data => {
    const client = await app.pg.connect();
    client.query('COMMIT');
    try {
      await client.query('BEGIN');
      // 1. process & create event
      const { userId, projectId, errorData } = data;
      const { systemInfo, requestInfo, stack, workspacePath, ...otherData } = errorData;
      const trimStackData = app.processEvent(stack, workspacePath);
      const { fingerprints, stripedStack, stackObjs } = trimStackData;

      const eventData = { userId, projectId, stripedStack, fingerprints, workspacePath, ...otherData, ...systemInfo };

      const { id: eventId } = await createEvent(client, eventData);

      //2. create code block
      const newestMap = await getNewestSourceMap(client, projectId);

      let codeBlocksRes = {};
      // if source map existed, produce code block
      console.log(newestMap);
      if (newestMap) {
        const Key = newestMap.file_name;
        const Bucket = process.env.S3_BUCKET_NAME;
        const command = new GetObjectCommand({
          Bucket,
          Key,
        });
        const response = await app.s3.send(command);
        const map = await response.Body.transformToString();

        // locate original codes
        const codeBlocksPromises = stackObjs.map(locateObj => app.locateMap(locateObj, map));

        const codeBlocks = await Promise.all(codeBlocksPromises);

        const codeBlockObjs = new Array(stackObjs.length).fill(null).map((_, i) => {
          let block;
          let errorLine;
          if (!codeBlocks[i]) {
            block = null;
            errorLine = null;
          } else {
            block = codeBlocks[i].codeBlock;
            errorLine = codeBlocks[i].errorLine;
          }

          const codeBlockObj = { ...stackObjs[i], block, errorLine };
          return codeBlockObj;
        });

        codeBlocksRes = await createCodeBlocks(client, eventId, codeBlockObjs);
      }

      // 3. create request_Info
      let requestInfoRes = {};
      if (requestInfo) {
        requestInfoRes = await createRequestInfo(client, eventId, requestInfo);
      }

      console.log(codeBlocksRes);

      const InsertRes = {
        eventId,
        codeBlockIds: Object.keys(codeBlocksRes) === 0 ? codeBlocksRes.map(el => el.id) : null,
        requestInfoRes,
      };

      console.log(InsertRes);
      client.query('COMMIT');
    } catch (err) {
      console.error(err);
      client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  app.listen({
    port: PORT,
  });

  const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

  signals.forEach(signal => {
    process.on(signal, () => gracefulShutdown(app));
  });

  console.log(`event process service ready at http://localhost:${PORT}`);
}

main();

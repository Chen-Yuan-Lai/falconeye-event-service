import SourceMap from 'source-map';
import fp from 'fastify-plugin';

const locateMapPlugin = fp(async fastify => {
  fastify.decorate('locateMap', async (locateObj, sourceMap) => {
    const { fileName, line, stack } = locateObj;

    const consumer = await new SourceMap.SourceMapConsumer(sourceMap);

    // Get the original source content
    const originalSourceIndex = consumer.sources.indexOf(fileName);
    const originalSourceLines = consumer.sourcesContent[originalSourceIndex];

    if (!originalSourceLines) return undefined;

    // trim original codes with 7 lines range
    const trimSource = originalSourceLines.split('\n');
    const blockLineIndex = {
      max: line - 1 + 7,
      min: line - 1 - 7,
    };

    if (blockLineIndex.max > trimSource.length) {
      blockLineIndex.max = trimSource.length;
    }

    if (blockLineIndex.min < 0) {
      blockLineIndex.min = 0;
    }

    const codeBlock = trimSource.slice(blockLineIndex.min, blockLineIndex.max + 1);
    const errorLine = trimSource[line - 1].trim();

    consumer.destroy();

    const res = {
      stack,
      codeBlock: codeBlock.join('\n'),
      errorLine,
    };

    return res;
  });
});

export default locateMapPlugin;

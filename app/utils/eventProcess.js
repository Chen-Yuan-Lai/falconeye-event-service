import fp from 'fastify-plugin';
import crypto from 'crypto';

const eventProcessPlugin = fp(async fastify => {
  const genHash = data => {
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest('base64');
  };

  fastify.decorate('processEvent', (stackData, workspacePath) => {
    const escapeRegExp = string => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special characters for RegExp
    const stripedStack = stackData
      .replace(/^ *at.*(\(|file:\/\/| )/gm, '')
      .replace(/^ *at /g, '')
      .replace(/\)/g, '')
      .replace(/\n+/g, '\n')
      .replace(new RegExp(escapeRegExp(`${workspacePath}`), 'g'), '');

    const stackObjs = [];
    stripedStack.split('\n').forEach(el => {
      if (el !== '' && el.startsWith('/')) {
        const trimStack = el.slice(1).split(':');
        stackObjs.push({
          stack: el,
          fileName: trimStack[0],
          line: +trimStack[1],
          column: +trimStack[2],
        });
      }
    });

    // generate fingerprints
    const fingerprints = genHash(stripedStack.replace(/:[0-9]*:[0-9]*/gm, ''));
    console.log(stripedStack.replace(/:[0-9]*:[0-9]*/gm, ''));
    console.log(fingerprints);

    const trimData = {
      fingerprints,
      stripedStack,
      stackObjs,
    };

    return trimData;
  });
});

export default eventProcessPlugin;

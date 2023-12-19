export const createEvent = async (client, eventData) => {
  const {
    userId,
    projectId,
    stripedStack,
    fingerprints,
    workspacePath,
    message,
    name,
    timestamp,
    osType,
    osRelease,
    architecture,
    nodeVersion,
    rss,
    heapTotal,
    heapUsed,
    external,
    arrayBuffers,
    uptime,
  } = eventData;
  const query = {
    text: `INSERT INTO events(
          user_id, 
          project_id,
          stack,
          fingerprints,
          work_space_path,
          message,
          name,
          created_at,
          os_type,
          os_release,
          architecture,
          version,
          mem_rss,
          mem_heap_total,
          mem_heap_used,
          mem_external,
          mem_array_buffers,
          up_time
          ) VALUES($1, $2, $3, $4, $5, $6,$7, $8, $9,$10, $11, $12, $13, $14, $15,$16, $17, $18) RETURNING *`,
    values: [
      userId,
      projectId,
      stripedStack,
      fingerprints,
      workspacePath,
      message,
      name,
      timestamp,
      osType,
      osRelease,
      architecture,
      nodeVersion,
      rss,
      heapTotal,
      heapUsed,
      external,
      arrayBuffers,
      uptime,
    ],
  };

  const res = await client.query(query);
  return res.rows[0];
};

export const createCodeBlocks = async (client, eventId, codeBlockObjs) => {
  const flatCodeBlocks = codeBlockObjs.flatMap(el => {
    const { fileName, block, errorLine, column, line, stack } = el;
    const codeBlock = [eventId, fileName, block, errorLine, column, line, stack];
    return codeBlock;
  });

  const placeholders = codeBlockObjs
    .map(
      (_, i) => `($${i * 7 + 1}, 
                   $${i * 7 + 2},
                   $${i * 7 + 3},
                   $${i * 7 + 4},
                   $${i * 7 + 5},
                   $${i * 7 + 6},
                   $${i * 7 + 7})`
    )
    .join(', ');
  const queryText = `INSERT INTO code_blocks(
                  event_id,
                  file_name,
                  block,
                  error_line,
                  error_column_num,
                  error_line_num,
                  stack)
                  VALUES ${placeholders} RETURNING *`;
  const res = await client.query(queryText, flatCodeBlocks);
  return res.rows;
};

export const createRequestInfo = async (client, eventId, requestInfo) => {
  const { url, method, host, userAgent, accept, queryParas, ip } = requestInfo;
  const p = queryParas ? JSON.stringify(queryParas) : null;
  const query = {
    text: `INSERT INTO request_info(
                          event_id,
                          url,
                          method,
                          host,
                          useragent, 
                          accept,
                          query_paras,
                          ip) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    values: [eventId, url, method, host, userAgent, accept, p, ip],
  };

  const res = await client.query(query);
  return res.rows[0];
};

export const getNewestSourceMap = async (client, projectId) => {
  const query = {
    text: `SELECT 
              * 
          FROM 
              source_maps 
          WHERE 
              project_id = $1 
              AND delete = false
              AND
                version = 
                (
                  SELECT MAX(version) FROM source_maps
                  WHERE project_id = $1
                )`,
    values: [projectId],
  };
  const res = await client.query(query);
  return res.rows[0];
};

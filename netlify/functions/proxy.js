// netlify/functions/proxy.js

// 目标 API 的基础地址
const TARGET_BASE_URL = 'https://doi9.top';

exports.handler = async (event) => {
  // 从路由规则中获取原始请求路径: event.queryStringParameters.path
  // 例如: 'v1/chat/completions'
  const requestPath = event.queryStringParameters.path || '';

  // 构建完整的请求目标 URL
  const targetUrl = `${TARGET_BASE_URL}/${requestPath}`;

  console.log(`[Proxy] Incoming: ${event.httpMethod} ${event.path}`);
  console.log(`[Proxy] Forwarding to: ${targetUrl}`);

  try {
    // 使用 Node.js 的 fetch API (Netlify Functions 环境内置)
    const response = await fetch(targetUrl, {
      method: event.httpMethod, // 使用原始请求的方法 (POST, GET, etc.)
      headers: {
        // 只转发必要的头部，特别是 Authorization 和 Content-Type
        'Authorization': event.headers.authorization || '',
        'Content-Type': event.headers['content-type'] || 'application/json',
      },
      body: event.body, // 将原始请求的 body 原封不动地转发过去
      redirect: 'follow', // 允许跟随跳转
    });

    // 将目标 API 的响应内容读取为文本
    const responseBody = await response.text();

    console.log(`[Proxy] Received response with status: ${response.status}`);

    // 构建并返回给浏览器的最终响应
    return {
      statusCode: response.status,
      body: responseBody,
      headers: {
        // 确保设置了正确的CORS头，允许你的游戏前端访问
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        // 将目标 API 的 Content-Type 也返回给浏览器
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    };
  } catch (error) {
    console.error('[Proxy] Error fetching from target API:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Proxy failed to connect to the target API.',
        details: error.message,
      }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    };
  }
};
// netlify/functions/proxy.js (V3 - 最终修复版)

const TARGET_BASE_URL = 'https://doi9.top';

exports.handler = async (event) => {
    // ------------------- 关键修复在这里 -------------------
    // 从 netlify.toml 的 /api/* 中提取 * 的部分
    // 正确的方法是从 event.path 中移除 /api/ 前缀
    let requestPath = '';
    if (event.path.startsWith('/api/')) {
        requestPath = event.path.substring('/api/'.length);
    }
    // ------------------- 修复结束 -------------------

    const targetUrl = `${TARGET_BASE_URL}/${requestPath}`;

    console.log(`[Proxy V3] Incoming: ${event.httpMethod} ${event.path}`);
    console.log(`[Proxy V3] Forwarding to: ${targetUrl}`); // <--- 检查这一行输出是否正确！

    const headers = new Headers();
    if (event.headers.authorization) {
        headers.set('Authorization', event.headers.authorization);
        console.log('[Proxy V3] Authorization header forwarded.');
    } else {
        console.log('[Proxy V3] Warning: No Authorization header in incoming request.');
    }
    if (event.headers['content-type']) {
        headers.set('Content-Type', event.headers['content-type']);
    }

    // 对于 OPTIONS 预检请求，我们直接返回成功，不实际请求目标API
    if (event.httpMethod === 'OPTIONS') {
        console.log('[Proxy V3] Handling OPTIONS preflight request.');
        return {
            statusCode: 204, // No Content
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
            body: '',
        };
    }

    try {
        const response = await fetch(targetUrl, {
            method: event.httpMethod,
            headers: headers,
            body: event.body,
        });

        const responseBody = await response.text();
        console.log(`[Proxy V3] Received response with status: ${response.status}`);

        if (response.headers.get('content-type')?.includes('text/html')) {
            console.log('[Proxy V3] Warning: Target API returned HTML content.');
        }

        return {
            statusCode: response.status,
            body: responseBody,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Content-Type': response.headers.get('content-type') || 'application/json',
            },
        };
    } catch (error) {
        console.error('[Proxy V3] Error fetching from target API:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Proxy failed.' }),
        };
    }
};

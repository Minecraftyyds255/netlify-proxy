// netlify/functions/proxy.js (V2 - 强化头部转发)

const TARGET_BASE_URL = 'https://doi9.top';

exports.handler = async (event) => {
    const requestPath = event.queryStringParameters.path || '';
    const targetUrl = `${TARGET_BASE_URL}/${requestPath}`;

    console.log(`[Proxy V2] Incoming: ${event.httpMethod} ${event.path}`);
    console.log(`[Proxy V2] Forwarding to: ${targetUrl}`);

    // 关键改动：创建一个新的、干净的 Headers 对象
    const headers = new Headers();

    // 1. 显式地从原始请求中提取并设置 Authorization
    if (event.headers.authorization) {
        headers.set('Authorization', event.headers.authorization);
        console.log('[Proxy V2] Authorization header forwarded.');
    } else {
        console.log('[Proxy V2] Warning: No Authorization header found in the incoming request.');
    }

    // 2. 显式地设置 Content-Type
    if (event.headers['content-type']) {
        headers.set('Content-Type', event.headers['content-type']);
    }

    // 3. 添加一些通用的头部，让请求看起来更像一个真实的浏览器
    headers.set('User-Agent', 'Netlify-Proxy-Function/1.0');
    headers.set('Accept', '*/*');


    try {
        const response = await fetch(targetUrl, {
            method: event.httpMethod,
            headers: headers, // 使用我们新创建的、干净的 headers 对象
            body: event.body,
            redirect: 'follow',
        });

        const responseBody = await response.text();
        console.log(`[Proxy V2] Received response with status: ${response.status}`);

        // 如果返回的仍然是HTML，打印一个警告
        if (response.headers.get('content-type')?.includes('text/html')) {
            console.log('[Proxy V2] Warning: Target API returned HTML content. Check if API key is correct or if the endpoint is valid.');
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
        console.error('[Proxy V2] Error fetching from target API:', error);
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

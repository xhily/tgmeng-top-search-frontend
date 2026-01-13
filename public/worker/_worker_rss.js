import dataMap from "./_worker_rss_datamap.js";

export default function generateRSS(key) {

    function findNode(map, key) {
        if (map[key]) return map[key];
        for (const node of Object.values(map)) {
            if (node.children) {
                const found = findNode(node.children, key);
                if (found) return found;
            }
        }
        return null;
    }

    // ❌ 禁止根路径
    if (key === "/") {
        return Promise.resolve(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
    <channel>
        <title>错误</title>
        <description>请访问具体平台的RSS，例如: /news/tencent/rss.xml</description>
        <link>https://tgmeng.com</link>
    </channel>
</rss>`);
    }

    const info = findNode(dataMap, key);

    if (!info) {
        return Promise.resolve(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
    <channel>
        <title>错误</title>
        <description>未找到该RSS源</description>
        <link>https://tgmeng.com</link>
    </channel>
</rss>`);
    }

    // ✅ 检查是否是父分类（有 children 的节点）
    if (info.children) {
        // 列出所有子平台
        // const childKeys = Object.keys(info.children);
        // const childList = childKeys.map(k => `  - ${k}/rss.xml`).join('\n');

        return Promise.resolve(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
    <channel>
        <title>${escapeXml(info.title)}</title>
        <description>此分类下有多个子平台，请访问具体的子平台RSS</description>
        <link>https://tgmeng.com</link>
        <item>
            <title>错误</title>
            <description>请访问具体平台的RSS，例如: /news/tencent/rss.xml</description>
        </item>
    </channel>
</rss>`);
    }

    // ✅ 只有叶子节点（没有 children 的）才执行数据获取
    function fetchData(node) {
        if (node.link) {
            console.log('🌐 请求:', node.link);

            return fetch(node.link, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Referer': 'https://tgmeng.com/',
                    'Origin': 'https://tgmeng.com',
                    'X-Custom-Source': 'tgmeng-rss-worker',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            })
                .then(res => {
                    console.log('  → 状态:', res.status, res.statusText);

                    const contentType = res.headers.get('content-type') || '';

                    if (res.status === 403 || contentType.includes('text/html')) {
                        return res.text().then(html => {
                            if (html.includes('Cloudflare') && html.includes('blocked')) {
                                console.error('❌ 被 Cloudflare 拦截！');
                                console.error('请在 Cloudflare Dashboard 中添加 WAF 规则白名单');
                                throw new Error('Cloudflare blocked: 请配置 WAF 白名单');
                            }
                            console.error('❌ 返回了 HTML 而不是 JSON:', html.substring(0, 200));
                            throw new Error(`Expected JSON but got HTML`);
                        });
                    }

                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                    }

                    return res.json();
                })
                .then(json => {
                    console.log('  ✓ 成功获取 JSON 数据');

                    const items = (json.data?.dataInfo || []).map(item => {
                        const pubDate = json.data?.dataUpdateTime
                            ? new Date(json.data.dataUpdateTime).toUTCString()
                            : new Date().toUTCString();
                        const platform = node.platform || '';
                        return {...item, pubDate, platform};
                    });

                    console.log('  ✓ 解析得到', items.length, '条数据');
                    return items;
                })
                .catch(err => {
                    console.error(`❌ 获取失败 [${node.platform}]:`, err.message);
                    return [];
                });
        }
        return Promise.resolve([]);
    }

    function escapeXml(str, useCdata = true) {
        if (str === undefined || str === null) str = '';
        if (useCdata) {
            return '<![CDATA[' + String(str).replace(/]]>/g, ']]]]><![CDATA[>') + ']]>';
        }
        return String(str).replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    return fetchData(info).then(dataInfo => {
        console.log('📊 最终数据:', dataInfo.length, '条');

        if (dataInfo.length === 0) {
            console.warn('⚠️ 没有数据！可能是 API 被拦截或返回空数据');
        }

        function generateItemXml(item) {
            const title = escapeXml(item.title || '无标题', true);
            const link = escapeXml(item.url || '', false);
            const description = `点击标题查看详细内容`;
            const platform = escapeXml(item.platform || '', true);
            const pubDate = item.pubDate || new Date().toUTCString();
            return `<item>
            <title>${title} - 来自【${platform}】</title>
            <link>${link}</link>
            <description>${description}</description>
            <pubDate>${pubDate}</pubDate>
            <guid isPermaLink="false">${link}</guid>
        </item>`;
        }

        const itemsXml = dataInfo.map(generateItemXml).join('\n            ');
        const lastBuildDate = dataInfo.length ? dataInfo.reduce((latest, item) => {
            const t = new Date(item.pubDate).getTime();
            return t > latest ? t : latest;
        }, 0) : new Date().getTime();
        const currentYear = new Date().getFullYear();

        const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>${escapeXml(info.title)}</title>
        <link>https://tgmeng.com</link>
        <description>${escapeXml(info.description)}</description>
        <language>zh-cn</language>
        <copyright>Copyright ${currentYear} tgmeng.com. All rights reserved.</copyright>
        <managingEditor>糖果梦</managingEditor>
        <webMaster>糖果梦</webMaster>
        <atom:link href="https://tgmeng.com${key}/rss.xml" rel="self" type="application/rss+xml" />
        <lastBuildDate>${new Date(lastBuildDate).toUTCString()}</lastBuildDate>
        <image>
            <url>https://tgmeng.com/logo.png</url>
            <title>糖果梦热榜</title>
            <link>https://tgmeng.com</link>
        </image>
        ${itemsXml}
    </channel>
</rss>`;

        console.log('✅ RSS 生成完成:', rssXml.length, '字节');
        return rssXml;
    });
}
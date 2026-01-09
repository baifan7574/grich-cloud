export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const data = await request.json();
        const { caseID, plaintiff, attorney, court, targetName, targetPlatform } = data;

        if (!env.DEEPSEEK_API_KEY) {
            return new Response(JSON.stringify({ error: "API Key not configured" }), { status: 500 });
        }

        const systemPrompt = `你是一位专业的美国电商知识产权诉讼分析师。你的任务是为 GRICH (Global Risk Intelligence) 撰写一份权威的合规研判报告。
报告必须严格基于用户提供的案件真实信息，做到“货要对版”。
你要根据原告和代理律所的风格（如 GBC, AMS, Sullivan 等），给出专业的策略建议。
报告风格应如同法庭公文般严谨、简练且具有权威性。`;

        const userPrompt = `案件详情：
- 案号：${caseID}
- 原告：${plaintiff}
- 代理律所：${attorney}
- 受理法院：${court}
- 目标实体：${targetName}
- 平台：${targetPlatform}

请生成两部分内容：
1. 报告摘要 (Summary)：综合研判该案件的性质、风险等级，以及该原告/律所的诉讼习惯。
2. 战略建议 (Action)：针对目标 ${targetName} 给出具体的应对建议（和解、应对、控损等）。

返回格式必须是 JSON：
{
  "summary": "...",
  "action": "..."
}`;

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.2
            })
        });

        const result = await response.json();
        const content = JSON.parse(result.choices[0].message.content);

        return new Response(JSON.stringify(content), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

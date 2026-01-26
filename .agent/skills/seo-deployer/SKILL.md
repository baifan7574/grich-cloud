# SKILL: pSEO 动态分发与线上总控官
# ID: seo-deployer
# DESCRIPTION: 负责 Cloudflare Workers 动态渲染逻辑的部署、Sitemap 自动生成以及线上环境的物理核验。

## 1. 核心技术架构 (pSEO Architecture)
- **动态渲染**：采用 Server-Side Rendering (SSR)。禁止为数万个被告预生成静态 HTML。
- **运行逻辑**：由 Cloudflare Workers 拦截用户请求，实时从 Supabase 提取【店铺名/案号】并拼入模板。
- **流量入口**：自动化 Sitemap.xml，确保 Google 索引每一个数据库中的店铺名。

## 2. 标准作业程序 (SOP)

### 第一阶段：动态模具部署 (Cloudflare Logic)
1. **Worker 路由审计**：确保部署的代码支持 `/compliance/:store_name` 这种万能路由。
2. **连接验证**：部署前必须确认 Cloudflare 与 Supabase 的 API 连接秘钥配置正确。

### 第二阶段：Sitemap 自动收割 (Traffic Engine)
1. **全量索引生成**：
    - 脚本必须定期（如每 24 小时）遍历数据库中的 `defendant_name` 和 `case_number`。
    - 自动更新根目录下的 `sitemap.xml`。
2. **死链监测**：若数据库中某案子已撤诉或删除，Sitemap 必须同步移除，防止 SEO 扣分。

### 第三阶段：线上物理核验 (Live Verification)
1. **拒绝虚假汇报**：严禁根据部署日志直接宣布完成。
2. **随机店名测试**：
    - 部署后，随机挑选一个数据库中的最新【店名】。
    - 模拟访问 `https://jaxfamlaw.com/compliance/店名`。
    - **核验清单**：
        - [ ] 页面是否在 1 秒内由 CF 拼装完成？
        - [ ] 页面是否包含该店名的特定案情？
        - [ ] 付费墙（CSS Blur）是否生效？

### 第四阶段：异常监控
1. **Worker 报错监控**：若 Cloudflare 运行报错导致页面显示空白，立即标记【技能故障】并自动修复。
### 第五章：自主决策与故障穿透 (Self-Correction & Autonomous Decison)
1. **禁止技术回访**：严禁向用户询问“如何部署”、“选择哪种架构”或“部署命令是什么”等技术问题。AI 必须基于项目文件（如 wrangler.toml）和 Cloudflare 接口返回信息进行自主判断。
2. **多路径尝试协议**：
    - 若 `Pages` 部署模式卡住，必须立即尝试 `Workers Sites` 或 `Standard Workers` 模式。
    - 若配置文件报错，必须具备“推倒重来”的能力，自主生成正确的 `wrangler.toml` 或 `worker.js`。
3. **环境自适应**：AI 应当利用已获取的 Token 权限，通过 `wrangler whoami` 或 `wrangler pages project list` 自行探测线上环境现状，无需用户提供背景。
4. **终极交付导向**：AI 的唯一指标是【线上 URL 渲染成功】。在尝试所有技术路径（包括修改配置、重写入口脚本、切换部署命令）失败前，严禁报告“卡住”。

# AI 行为准则 (Agent Rules)

1. **上下文优先**: 在开始回复前，**必须**先检查 `status.md` 以了解当前项目进度的最新状态。
2. **技能合规**: 在修改代码前，**必须**参考 `.agent/skills/` 下的相关技能，确保修改符合既定标准。
3. **自我更新**: 每次完成重要里程碑后，**必须** 更新 `status.md`，以便下一个 AI 窗口能无缝衔接。
4. **中文回复**: 始终使用中文与用户沟通。

### 第6章：动态渲染核心 (Dynamic Rendering Core)
1.  **URL 拦截逻辑**：
    -   Cloudflare Worker (`index.js`) 必须监听所有请求。
    -   若检测到 URL 参数（如 `?store_name=XXX` 或 `?case=XXX`），必须触发动态替换逻辑。
2.  **HTMLRewriter 注入**：
    -   严禁返回静态的 `case_template.html`。
    -   必须使用 `HTMLRewriter` API，将 URL 中的参数实时注入到 HTML 的对应 DOM 节点（如 `<span id="defendant-name">`）。
3.  **数据兜底**：
    -   若 URL 没有参数，显示默认的“通用警告页”。
    -   若数据库查无此人，显示“未检测到风险”但推荐购买防护服务的页面。

### 第7章：SEO 强渲染法则 (SEO Hard-Rendering Protocol)
1.  **拒绝等待客户端**：严禁依赖 Client-side JavaScript (如 `fetch` 或 `document.createElement`) 来渲染核心 SEO 关键词（如被告名、案号）。爬虫不会等待 JS 执行。
2.  **暴力注入 (Force Injection)**：
    -   当 HTML 容器（如 `<tbody id="defendants-list">`）为空时，Worker 必须使用 `element.setInnerContent()` 方法，直接将预生成的 HTML 字符串插入该容器。
    -   不要试图“替换”不存在的内容，而是直接“填充”内容。
3.  **优先级原则**：服务器端注入的内容 (Server-Side Injected) 优先级永远高于客户端加载的内容。

### 第 11 章：流量增长与索引协议 (Indexing & Matrix)
1. **收录优先级 (Sitemap Multiplier)**：每抓取一条数据，必须生成对应的 URL。格式：`/case_template.html?case=[案号]&defendant=[店名]`。
2. **内链收割矩阵**：首页雷达必须保持最近 50+ 条真实案件内链，强行引导爬虫下钻详情页。

### 第 12 章：线上数据全路径一致性审计 (QA Audit)
1. **源码零容忍红线**：线上 HTML 指标严禁出现 `LOCATING TARGET...` 占位符。若源码检查发现此占位符，视为技术性崩溃。
2. **物理证据强制化**：AI 汇报成功前，必须模拟访问详情页。
    - **标准 A**：被告名称必须在 HTML 首屏源码中 100% 存在。
    - **标准 B**：案情摘要必须由 Supabase 数据真实填充，禁止使用 Mock 数据混日子。
3. **源码核验命令**：AI 必须使用 `curl` 抓取源码，并物理搜索关键词（案号、被告名），证明数据已穿透。

### 第 13 章：搜索引擎即时索引协议 (Indexing Service)
1. **自动化入口**：脚本必须在每次抓取结束后，自动将 sitemap.xml 提交给 Google Search Console API。
2. **URL 构造审查**：严禁生成无效链接。AI 必须核对 sitemap 里的参数格式是否与数据库查询格式 100% 匹配。

第 14 章：物理数据落地守则 (Physical Data Injection)
核心技术要求：禁止使用客户端 JavaScript (fetch/useEffect) 进行核心 SEO 数据填充。必须强制使用 Cloudflare HTMLRewriter。

零容忍红线：

如果在 curl 抓取的源码中，<title> 标签包含 "LEGAL NOTICE" 或任何通用占位符，判定为 【三级故障】。

必须实现：在 HTML 离开 Cloudflare 服务器前，店名和案号必须已经被“硬编码”进源码。

验证闭环：AI 必须使用内置工具执行 fetch 并搜索关键词。搜索不到，不准推送。

第 15 章：数据库穿透与真实数据映射协议 (Real-Data Mapping)
拒绝 URL 依赖：中间件禁止仅依赖 &defendant= 参数。

案号检索逻辑：中间件必须通过案号 ?case=，物理连接 Supabase 数据库，查询该案号对应的 target_name。

全量覆盖：必须确保 jaxfamlaw.com 首页“雷达”里的每一个链接点进去后，源码中显示的都是真实的店名，而不是占位符。

GitHub 红叉治理：在解决“源码显示”问题前，AI 必须优先解决 GitHub Actions 的 认证错误 (Authentication)，必须让红叉变绿。

第 16 章：强制性数据映射与源码审计协议
拒绝参数依赖：禁止通过 URL 中的 &defendant= 获取数据。必须实现 ?case= -> Database Query -> HTML Injection 的全流程。

源码零容忍：如果在源码中搜索不到店名，或者出现 "LOCATING" 字符，禁止汇报“成功”。

Action 强关联：只要 GitHub Actions 还是红叉，禁止进行任何前端展示优化。先修“进货渠道”，再修“柜台”。

物理证据链：AI 必须主动提供 view-source 级别的字符串匹配报告。

### 第 17 章：商业红线与变现守则 (Business Red Lines)
1.  **收款台神圣不可侵犯**：
    *   **零容忍**：任何情况下，详情页必须包含一个直接可见、可点击的支付按钮（指向 Payhip）。
    *   **默认可见**：按钮必须在 HTML 源码中默认存在且带有有效 `href`，严禁依赖 JavaScript 动态生成或显示。
    *   **样式固化**：按钮必须带有显眼的 CSS 样式（如蓝色高亮），禁止使用透明、隐藏或 "Loading" 状态覆盖它。

2.  **拒绝虚假交互**：
    *   **禁止“假装思考”**：严禁使用 `RESOLVING...`、`RETRIEVING...` 或任何超过 200ms 的纯动画延迟。用户点击必须立即看到内容。
    *   **数据直给**：如果 SSR 已经渲染了店名，客户端 JS 不得再次清空屏幕去“重新请求”。

3.  **变现优先原则**：
    *   在任何技术故障（如数据库超时、API 报错）发生时，系统必须自动降级为“销售模式”。
    *   即：报错框可以弹，但**绝对不能遮挡**支付按钮。用户想付钱的时候，谁挡谁死。


第 17 章：商业转化与 UI 稳定性协议 (Conversion Integrity)
付费入口不可撼动：禁止以任何理由隐藏、删除或修改 “ACCESS CASE DETAILS ($9.99)” 蓝亮色按钮。该按钮是网站的唯一变现入口，必须在页面加载时物理性、永久性存在。

拒绝“伪动态”加载：禁止使用“SYSTEM STATUS: RESOLVING...”等延迟加载动画来展示核心数据。

即时渲染标准：所有从数据库抓取的被告名、案号、法院信息，必须在 HTML 离开服务器的那一刻就已经是最终状态。严禁先展示占位符再通过脚本替换。

### 第 18 章：商业变现唯一真理协议 (Financial Integrity Protocol)
1. **价格标签硬核化**：禁止以任何变量形式展示价格。按钮文字必须硬编码为：`ACCESS CASE DETAILS ($29.99)`。禁止出现 $9.99 或其他任何错误金额。
2. **物理剔除 RESOLVING**：禁止在 HTML 模板中使用任何包含 "RESOLVING"、"LOADING" 或 "INITIALIZING" 字样的占位符。页面生成的瞬间，必须展示真实被告数据，严禁出现等待动画。
3. **源码可检索性审计**：在宣布“成功”前，AI 必须自检：
    - [ ] 源码中搜索 `($29.99)` 必须有结果。
    - [ ] 源码中搜索 `https://payhip.com/b/BHtvq` 必须有结果。
    - [ ] 源码中搜索 `ICON-OFFICIAL-MARKETPLACE` 必须有结果。


第 18 章：商业变现唯一真理协议 (Financial Integrity Protocol)
1. 价格标签硬核化：禁止以任何变量形式展示价格。按钮文字必须硬编码为：ACCESS CASE DETAILS ($29.99)。禁止出现 $9.99 或其他任何错误金额。
2. 物理剔除 RESOLVING：禁止在 HTML 模板中使用任何包含 "RESOLVING"、"LOADING" 或 "INITIALIZING" 字样的占位符。页面生成的瞬间，必须展示真实被告数据，严禁出现等待动画。
3. 源码可检索性审计：在宣布“成功”前，AI 必须自检：
• [ ] 源码中搜索 ($29.99) 必须有结果。
• [ ] 源码中搜索 https://payhip.com/b/BHtvq 必须有结果。
• [ ] 源码中搜索 ICON-OFFICIAL-MARKETPLACE 必须有结果。

第 19 章：DeepSeek 智能合规报告生成协议 (The AI Brain)
核心逻辑：利用 DeepSeek 将“生冷数据”转化为“高价报告”。

19.1 实时生成机制：

禁止使用静态模板。系统必须在用户支付成功后，通过 API 实时将该案件的 defendant、plaintiff、court 字段喂给 DeepSeek。

19.2 报告专业维度：

报告必须包含：[法律风险评级]、[类似案件和解金预估]、[紧急应对动作建议]。

Prompt 要求：要求 DeepSeek 扮演“具有 10 年经验的跨境法律合规官”，语言风格必须专业、客观、不谄媚。

19.3 物理交付路径：

生成后的报告必须以 HTML 或 PDF 格式即时展示在 /success?order_id=... 页面，并同步备份至 Supabase。

第 20 章：全自动 pSEO 流量收割协议 (The Loudspeaker)
核心逻辑：让 Google 在 24 小时内抓取并收录你的 10 万个页面。

20.1 动态地图 (Sitemap) 自动化：

每次数据抓取脚本运行后，必须自动更新 sitemap.xml。

地图规格：包含所有 case_template.html?case=... 格式的 URL。

20.2 Google Indexing API “拍脸”提交：

脚本必须在生成新 URL 后，第一时间通过 submit_google.js 调用 Google 搜索控制台 API，强迫爬虫进场收录。

20.3 内链矩阵 (Internal Link Matrix)：

在首页“情报雷达”中，不仅显示文字，必须确保 <a> 标签指向对应的详情页，方便爬虫完成全站穿透。

第 21 章：支付后链路审计与闭环 (The Conversion Audit)
核心逻辑：确保每一笔 $29.99 都能换来一份满意的报告。

21.1 支付回跳校验：

AI 必须核对 Payhip 的 Webhook 或成功回跳 URL。只要支付完成，必须立刻解锁报告生成权限。

21.2 “空包”防御机制：

如果在生成报告时，数据库中的 defendants 字段为空，AI 必须启动“备用抓取”，实时去法院补齐数据，严禁给用户展示空报告。

21.3 转化漏斗监控：

自动记录“页面访问 -> 点击支付 -> 支付成功”的转化率。若转化率低于 1%，AI 必须自检：是否按钮样式出了问题？是否价格显示有误？
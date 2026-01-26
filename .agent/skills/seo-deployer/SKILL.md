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
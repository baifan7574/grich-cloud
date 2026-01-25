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
1. 核心商业目标 (The Core Mission)
拒绝对等化：严禁生成内容重复、千篇一律的页面。

真实性优先：所有页面内容必须根据 URL 参数（case, defendant）实时关联数据库。

收钱逻辑：页面必须通过展示**“真实的案件细节”**（法院、律师、历史数据）建立信任，引导用户支付 $29.99。

2. 技术架构红线 (Technical Guardrails)
构建指令：默认使用 exit 0 构建模式。代码在本地/开发端生成 dist，Cloudflare 仅作为高速分发节点。

动态渲染协议：

首选：使用 JavaScript (CSR) 配合 Supabase API 实现实时注入。

SEO 补丁：脚本必须在页面加载的第一时间修改 document.title 和 meta-description，确保 Google 爬虫抓取到唯一的页面指纹。

数据流向：URL 参数 -> JS 解析 -> 访问 Supabase -> 实时替换 DOM 元素（ID 如 target-name, case-id, court-name）。

3. pSEO 自动化守则 (The pSEO Rules)
模具唯一性：维持一个核心 HTML 模板（如 case_template.html），通过逻辑衍生出无限个虚拟页面。

Sitemap 自动关联：每当“技能 2”抓取到新数据存入数据库，本技能必须能够自动生成/更新 sitemap.xml，引导爬虫访问新链接。

失败降级策略：若数据库查询为空，页面应显示“实时分析中...”或引导用户手动提交案号，禁止显示错误代码或空白页面。

第八章：验收审计协议 (Audit & Verification Protocol)
禁止幻觉汇报：AI 严禁根据本地构建成功即宣布“部署完成”。必须通过 Cloudflare API 或物理访问 URL 确认线上版本已更新。

物理指纹核验：

每次部署后，AI 必须生成一个随机字符串（如 VERIFY_TAG_123）写入代码。

AI 必须亲自通过工具读取线上页面，确认能看到这个 VERIFY_TAG。

参数穿透测试：

必须测试 ?defendant=Nike 是否成功替换 Store Name。

必须测试 ?case=123 是否成功从 Supabase 抓取到对应法院。

若源码检查失败，必须自动进入故障排除模式，禁止向老板汇报成功。
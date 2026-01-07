**🛠️ GRICH 前端界面优化与致命风险修复指令**

**致 AI Agent：** 请根据以下反馈，对当前的 Next.js 页面（app/compliance/[brand]/page.tsx）进行深度重构，重点修复“致命风险点”并优化转化逻辑。

**1. 修复 API 报错暴露问题 (Graceful Fallback)**

* **现状：** 界面中心直接显示了 {"error": "DeepSeek API connection failed."}，这属于严重的 UI 事故，会瞬间丧失用户信任。
* **指令：** \* 严禁将原始 JSON 报错信息渲染给用户。
  + **实现逻辑：** 如果 DeepSeek API 调用失败或超时，请显示一个预设的“专业法律分析占位符”。
  + **文案建议：** “AI 正在深度解析美国联邦法院卷宗数据，请稍后...” 或展示一段基于数据库字段自动生成的“初步合规性风险提示”。

**2. 注入“专家勋章” (SEO 与信任背书)**

* **现状：** 界面目前纯机器感太强，缺乏人的背书，极易被 Google 判定为内容农场。
* **指令：** \* 在页面底部或“Docket Snapshot”侧边，增加一个**专家认证模块**。
  + **文案内容：** “Audit Verified by Michael Bai (16-Year Legal & E-Commerce Expert)”。
  + **样式要求：** 增加一个金色或蓝色的微型勋章图标，体现专业度。

**3. 强化转化按钮 (CTA Optimization)**

* **现状：** "UNLOCK FULL REPORT" 按钮为白色，在深色背景下不够醒目。
* **指令：** \* 将按钮背景颜色更改为更具行动力的**亮绿色或金黄色**（例如 Tailwind 的 bg-green-500 或 bg-yellow-400）。
  + 按钮文字加粗，并增加一个小图标（如：Lock 或 PDF 图标）。

**4. 后端数据结构补全 (Supabase Field Logic)**

* **指令：** \* 请确保从 Supabase 读取数据时，包含以下字段以支撑界面显示： \* risk\_score: 对应左上角圆环数值。 \* status\_text: 对应案件当前状态（如 "Injunction Granted"）。 \* case\_summary: 对应 AI 生成的摘要部分。

**5. 交互性增强**

* **指令：** 给“Risk Index”圆环增加一个 CSS 扫过动画或入场加载效果，让用户感知到系统正在“实时计算”该品牌的风险等级。

**请在修改完成后，告诉我你采用了哪种方案来隐藏 API 报错。**
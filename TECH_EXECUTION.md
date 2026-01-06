**文档三：TECH\_EXECUTION.md (技术执行表)**

**作用：定义“施工标准”，规定数据库与功能模块逻辑**

* **技术栈**：已确定使用 **Astro 5.0 (Plan B)** 部署于 Cloudflare Pages 。

+2

* **数据库 (Supabase)**：维护 lawsuits（存储品牌、案号、风险分等）和 reports（存储生成报告信息）两张核心表 。

+1

* **核心功能模块**：
  + **种子引擎 (脚本 1)**：对接 CourtListener 或 Justia 接口 。清洗 brand\_name（剔除 Inc. 等后缀），存入数据库 。

+2

* + **动态路由页**：配置 /compliance/[brand] 路由 。实时读取数据，展示风险圆环加载动画 。

+4

* + **报告生成 (脚本 2)**：接收支付 Webhook，调用 DeepSeek API 生成结构化 Markdown 报告并转换为 PDF 交付 。
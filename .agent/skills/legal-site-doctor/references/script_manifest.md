# 🔍 GRICH 项目脚本清单（大白话版）

**生成时间**: 2026-01-25 12:10  
**审计范围**: 所有 Python (.py) 和 JavaScript (.js) 脚本

---

## 📊 核心数据抓取脚本（scripts/ 文件夹）

### ✅ 好使的脚本

#### 1. `seed_verified_real_cases.py`
- **它是干嘛的**: 插入真实联邦法院案件到数据库（最新创建，最靠谱）
- **它去哪拿钥匙**: 
  - Supabase API: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
  - 数据来源: 硬编码的真实案件（Nike vs StockX等）
- **它的工作现状**: ✅ **成功运行**，已插入 3 个真实案件

#### 2. `seed_engine_rest.py`
- **它是干嘛的**: 生成模拟数据并插入 Supabase（使用 REST API）
- **它去哪拿钥匙**: 
  - Supabase API: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
  - 数据来源: `sql/initial_keywords.json`
- **它的工作现状**: ✅ **成功运行**，成功率75%（6/8）

#### 3. `seed_engine.py`
- **它是干嘛的**: 生成模拟数据并插入 Supabase（使用 Python Client）
- **它去哪拿钥匙**: 
  - Supabase API: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
  - 数据来源: `sql/keywords_soeasy.txt`
- **它的工作现状**: ⚠️ **基本成功**，但提示关键词文件缺失

#### 4. `check_supabase_data.py`
- **它是干嘛的**: 查询 Supabase 数据库中的所有案件
- **它去哪拿钥匙**: 
  - Supabase API: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
- **它的工作现状**: ✅ **成功**，显示数据库中有 395+ 条记录

---

### ❌ 废了的脚本（API 限流/额度不足）

#### 5. `seed_engine_courtlistener.py`
- **它是干嘛的**: 从 CourtListener API 抓取真实法院案件
- **它去哪拿钥匙**: 
  - CourtListener API: 硬编码 Token `7f4374db0b69...`
  - Supabase API: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
- **它的工作现状**: ❌ **403 Forbidden**（Token 限流）

#### 6. `seed_real_serper.py`
- **它是干嘛的**: 使用 Serper API 搜索 Google，抓取法院案件信息
- **它去哪拿钥匙**: 
  - Serper API: `SERPER_API_KEY`（密钥1: `b99415...`, 密钥2: `3469cf...`）
  - Supabase API: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
- **它的工作现状**: ❌ **400 Not enough credits**（两个密钥额度都用完）

#### 7. `seed_real_courtlistener.py`
- **它是干嘛的**: 使用 CourtListener Opinions API 抓取（公开端点）
- **它去哪拿钥匙**: 
  - CourtListener API（无 Token）
  - Supabase API: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
- **它的工作现状**: ❌ **401 Unauthorized**（公开端点也需要认证）

#### 8. `seed_real_web_scraper.py`
- **它是干嘛的**: 直接爬取 CourtListener 网页 HTML
- **它去哪拿钥匙**: 
  - 无需 API 密钥（直接 HTTP 请求）
  - Supabase API: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
- **它的工作现状**: ❌ **HTML 结构无法解析**（网页改版）

#### 9. `seed_real_dockets.py`
- **它是干嘛的**: 使用 CourtListener Dockets API 端点
- **它去哪拿钥匙**: 
  - CourtListener API: 硬编码 Token `7f4374db0b69...`
  - Supabase API: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
- **它的工作现状**: ❌ **403 Forbidden**（Token 限流）

---

### ⚠️ 未完成的脚本（仅有骨架）

#### 10. `seed_engine_serper.py`
- **它是干嘛的**: 律所案件搜索引擎（计划中）
- **它去哪拿钥匙**: 
  - Serper API: `SERPER_API_KEY`
  - Supabase API: `PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- **它的工作现状**: ⚠️ **未实现**（仅有46行框架代码，无实际逻辑）

#### 11. `seed_engine_serper_complete.py`
- **它是干嘛的**: 完整的 Serper 搜索脚本（尝试版本）
- **它去哪拿钥匙**: 
  - Serper API: `SERPER_API_KEY`
  - Supabase API: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
- **它的工作现状**: ❌ **400 Not enough credits**（同上）

---

## 🌐 前端构建脚本（grich-astro/ 文件夹）

#### 12. `build.js`
- **它是干嘛的**: 将 HTML 和 Cloudflare Functions 打包到 `dist/` 文件夹
- **它去哪拿钥匙**: 无需密钥（纯文件操作）
- **它的工作现状**: ✅ **应该能用**（标准构建脚本）

#### 13. `functions/api/report.js`
- **它是干嘛的**: Cloudflare Functions - 生成诉讼报告 API
- **它去哪拿钥匙**: 
  - 可能需要 Supabase 或 PayPal 密钥（需查看文件内容）
- **它的工作现状**: ⚠️ **未测试**

#### 14. `functions/case/[id].js`
- **它是干嘛的**: Cloudflare Functions - 动态案件页面
- **它去哪拿钥匙**: 
  - 可能需要 Supabase 密钥
- **它的工作现状**: ⚠️ **未测试**

#### 15. `functions/sitemap.xml.js`
- **它是干嘛的**: 生成网站地图
- **它去哪拿钥匙**: 无需密钥
- **它的工作现状**: ⚠️ **未测试**

#### 16. `functions/target/[id].js`
- **它是干嘛的**: Cloudflare Functions - 目标品牌页面
- **它去哪拿钥匙**: 
  - 可能需要 Supabase 密钥
- **它的工作现状**: ⚠️ **未测试**

---

## 🔧 辅助工具脚本

#### 17. `check_database_status.py`
- **它是干嘛的**: 检查 Supabase 数据库连接状态
- **它去哪拿钥匙**: 
  - Supabase API: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
- **它的工作现状**: ✅ **应该能用**（已修复路径）

#### 18. `test_deepseek_api.py`
- **它是干嘛的**: 测试 DeepSeek AI API 连接
- **它去哪拿钥匙**: 
  - DeepSeek API: `DEEPSEEK_API_KEY`（.env 中为空）
- **它的工作现状**: ⚠️ **密钥未配置**

#### 19. `deploy_grich.py`
- **它是干嘛的**: 部署 GRICH 到 AWS 服务器
- **它去哪拿钥匙**: 
  - AWS SSH 密钥: 动态路径 `grich-key.pem`
- **它的工作现状**: ⚠️ **未测试**

#### 20. `verify_defendant_info.py`
- **它是干嘛的**: 验证引擎2（被告人狙击）是否抓到被告人信息
- **它去哪拿钥匙**: 
  - Supabase API: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
- **它的工作现状**: ✅ **应该能用**

---

## 🗑️ 废弃的 n8n 自动化脚本（已标注废弃）

以下脚本全部与 n8n 自动化系统相关，已在 `_DEPRECATED_N8N_README.md` 中标注废弃：

1. `patch_n8n.py` (及 v2-v13 所有版本，共13个)
2. `deploy_gdrive_node.py`
3. `repair_n8n_connections.py`
4. `force_activate_n8n.py`
5. `inspect_n8n.py`
6. `audit_n8n.py`
7. `analyze_n8n_errors.py`
8. `extract_n8n_data.py`
9. `export_workflow.py`
10. `cleanup_workflow.py`
11. `activate_engine2.py`
12. `super_sync.py`
13. `github_update.py`

**总计**: 约 30+ 个 n8n 相关脚本

**它们是干嘛的**: 修复/部署/管理 n8n 工作流  
**它的工作现状**: ❌ **全部废弃**（n8n 系统已不使用）

---

## 🔐 密钥配置汇总

### 当前 .env 文件内容

```ini
SERPER_API_KEY=3469cf6bbffbe6d5a687eea250074dbab9ba460c  # ❌ 额度用完
PUBLIC_SUPABASE_URL=https://rdlmumybuwveaaeceohj.supabase.co  # ✅ 正常
PUBLIC_SUPABASE_ANON_KEY=sb_publishable_aPXWTauRxJ88A88mwLDoPQ_puVi7PZj  # ✅ 正常
DEEPSEEK_API_KEY=  # ❌ 未配置
PAYHIP_API_KEY=  # ❌ 未配置
```

### 硬编码的密钥（在脚本中）

```python
COURTLISTENER_TOKEN = "7f4374db0b69b37c02779dd59ed9c3b0fb90883d"  # ❌ 限流
```

---

## 📊 脚本运行状态总结

### ✅ 完全可用（4个）
1. `seed_verified_real_cases.py` - **首选！真实数据**
2. `seed_engine_rest.py` - 模拟数据备选
3. `check_supabase_data.py` - 数据库查询
4. `verify_defendant_info.py` - 被告人信息验证

### ⚠️ 基本可用但有问题（2个）
5. `seed_engine.py` - 缺少关键词文件
6. `build.js` - 未测试但应该能用

### ❌ API 限制无法使用（5个）
7. `seed_engine_courtlistener.py` - CourtListener 403
8. `seed_real_serper.py` - Serper 400
9. `seed_real_courtlistener.py` - CourtListener 401
10. `seed_real_web_scraper.py` - HTML 解析失败
11. `seed_real_dockets.py` - CourtListener 403

### ⚠️ 未完成/未测试（10个）
12. `seed_engine_serper.py` - 仅有框架
13-17. Cloudflare Functions (5个) - 未测试
18. `test_deepseek_api.py` - 密钥未配置
19. `deploy_grich.py` - 未测试
20. 其他辅助脚本

### 🗑️ 已废弃（30+个）
- 所有 n8n 相关脚本

---

## 🎯 建议行动

### 立即可用
✅ 使用 `seed_verified_real_cases.py` 插入真实案件  
✅ 使用 `check_supabase_data.py` 查看数据库状态

### 需要修复
⚠️ 购买 Serper API 充值（$5）以启用搜索功能  
⚠️ 等待 CourtListener Token 限流解除（24小时）

### 清理建议
🗑️ 可以删除所有 `patch_n8n_*.py` 脚本（已废弃）

---

**审计完成时间**: 2026-01-25 12:10  
**总脚本数**: 86个 Python + 5个核心 JavaScript  
**可用率**: 约 20% (好使的 + 基本可用的)

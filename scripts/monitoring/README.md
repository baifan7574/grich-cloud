# 🤖 引擎2全自动化系统

## 📋 系统概述

引擎2是GRICH项目的被告人狙击系统，通过自动化抓取GBC律所网站的公开数据，为被起诉的跨境卖家提供精准的个人化法律情报服务。

### 核心价值
- **超高转化率**: 40-50%（vs 引擎1的2%）
- **完全自动化**: 无需人工干预
- **合法合规**: 数据来自律所公开送达文件

---

## 🏗️ 系统架构

```
GitHub Actions (每天自动运行)
    ↓
1. gbc_auto_sniper.js
   - 扫描 GBC 律所网站
   - 自动下载 Excel 文件
    ↓
2. excel_parser.js
   - 自动解析被告人信息
   - 数据清洗和去重
    ↓
3. auto_import.js
   - 自动导入 Supabase
   - 错误处理和报告
    ↓
完成！
```

---

## 🚀 快速开始

### 第1步: 创建数据库表

在 Supabase SQL Editor 中执行：

```bash
# 文件位置
d:\quicktoolshub\雷达监控。\GRICH\sql\create_defendants_table.sql
```

### 第2步: 安装依赖

```bash
cd d:\quicktoolshub\雷达监控。\GRICH\grich-astro\scripts\monitoring
npm install
```

### 第3步: 配置环境变量

创建 `.env` 文件（或使用现有的）：

```env
PUBLIC_SUPABASE_URL=https://rdlmumybuwveaaeceohj.supabase.co
SUPABASE_SERVICE_KEY=你的service_role_key
```

### 第4步: 测试运行

```bash
# 完整流程测试
npm run full-sync

# 或分步测试
npm run sniper   # 1. 抓取数据
npm run parse    # 2. 解析Excel
npm run import   # 3. 导入数据库
```

---

## 📁 文件说明

### 核心脚本

| 文件 | 功能 | 运行时间 |
|-----|------|---------|
| `gbc_auto_sniper.js` | 扫描GBC网站，下载Excel | ~5分钟 |
| `excel_parser.js` | 解析Excel，提取被告人 | ~1分钟 |
| `auto_import.js` | 导入Supabase数据库 | ~2分钟 |

### 配置文件

| 文件 | 用途 |
|-----|------|
| `package.json` | 依赖管理 |
| `.github/workflows/gbc-sniper.yml` | 自动化调度 |
| `sql/create_defendants_table.sql` | 数据库表结构 |

---

## 🔧 配置说明

### gbc_auto_sniper.js 配置

```javascript
const CONFIG = {
    SCAN_YEAR: 25,      // 扫描年份 (2025)
    START_ID: 1,        // 起始案件ID
    END_ID: 100,        // 结束案件ID
    DELAY_MS: 2000      // 请求间隔(毫秒)
};
```

### GitHub Actions 配置

在 GitHub 仓库设置中添加 Secrets：

```
SUPABASE_URL = https://rdlmumybuwveaaeceohj.supabase.co
SUPABASE_SERVICE_KEY = (从Supabase获取)
```

---

## 📊 预期效果

### 数据量预估

- **每月新增案件**: ~50个
- **每个案件被告人**: ~100人
- **每月新增被告人**: ~5,000人
- **6个月后总量**: ~30,000人

### 收入预估

**保守估计**:
- 每天搜索量: 10人
- 转化率: 40%
- 客单价: $29.90
- **日收入**: $119.60
- **月收入**: $3,588

**6个月后**:
- 每天搜索量: 50人
- **月收入**: $18,000+

---

## 🛠️ 故障排查

### 问题1: SharePoint下载失败

**症状**: `Download failed: HTTP 403`

**解决方案**:
- SharePoint可能需要登录
- 考虑使用Puppeteer模拟浏览器
- 或联系律所获取API访问权限

### 问题2: Excel解析错误

**症状**: `Extracted 0 valid defendants`

**解决方案**:
- 检查Excel文件格式
- 更新 `excel_parser.js` 中的列名映射
- 查看 `parsed_defendants.json` 了解详情

### 问题3: Supabase导入失败

**症状**: `Error: Missing Supabase credentials`

**解决方案**:
- 检查环境变量是否正确设置
- 确认使用的是 `service_role_key` 而不是 `anon_key`
- 验证数据库表已创建

---

## 📈 监控和维护

### 查看运行日志

GitHub Actions:
```
仓库 → Actions → GBC Sniper → 最新运行
```

### 查看数据库

Supabase:
```sql
-- 查看总数
SELECT COUNT(*) FROM defendants;

-- 查看最新数据
SELECT * FROM defendants 
ORDER BY found_at DESC 
LIMIT 10;

-- 按品牌统计
SELECT brand_name, COUNT(*) as count
FROM defendants
GROUP BY brand_name
ORDER BY count DESC;
```

### 手动触发运行

GitHub:
```
仓库 → Actions → GBC Sniper → Run workflow
```

---

## 🔒 安全和合规

### 数据来源合法性

✅ **完全合法**:
- 数据来自律所公开送达文件
- 这是公开的法律文件
- 任何人都可以查看

### 隐私保护

- 不收集非公开信息
- 仅展示律所已公开的数据
- 页面包含免责声明

---

## 📞 支持

### 遇到问题？

1. 查看 `import_report.json` 了解详细错误
2. 检查 GitHub Actions 运行日志
3. 查看本文档的故障排查部分

### 需要帮助？

- 查看项目文档
- 联系开发团队

---

**最后更新**: 2026-01-07  
**版本**: 1.0.0

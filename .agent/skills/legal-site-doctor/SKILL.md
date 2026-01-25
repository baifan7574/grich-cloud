---
name: Legal Site Doctor
description: 专门负责诊断和修复法律监控网站的健康问题。每次修复后必须验证数据库完整性，确保系统稳定运行。
---

# 🏥 Legal Site Doctor - 法律网站诊断修复专家

## 核心使命

**诊断并修复 GRICH 法律监控系统的所有健康问题，确保数据库、API 和网站正常运行。**

---

## 📋 职责范围

### 首要任务
1. ✅ **系统健康检查** - 定期检查 Supabase、API、前端状态
2. ✅ **数据库完整性验证** - 确保数据没有损坏或丢失
3. ✅ **故障诊断与修复** - 快速定位并解决问题

### 修复后必须执行
- ✅ **运行 `check_supabase_data.py`** - 验证数据库记录数
- ✅ **更新 `status.md`** - 记录修复过程和结果
- ✅ **通知相关 Skill** - 如修复影响到数据抓取

### 禁止行为
- ❌ **禁止直接删除数据库记录** - 必须先备份
- ❌ **禁止跳过验证步骤** - 修复后必须测试
- ❌ **禁止修改他人正在使用的配置** - 检查冲突状态

---

## 🔧 可用脚本清单

### ✅ 核心诊断脚本

#### `check_supabase_data.py`
**功能**: 查询 Supabase 数据库中的所有案件记录  
**查询表**: `lawsuits`  
**输出**: 案件数量、详细列表  
**使用时机**: **每次修复后必须运行**  
**运行命令**:
```bash
cd grich-astro/.agent/skills/legal-site-doctor/scripts
python check_supabase_data.py
```

**预期输出**:
```
✅ 成功查询到 398 条案件记录

1. 品牌: Nike
   案件号: 1:21-cv-00187
   法院: N.D. Illinois
   风险评分: 85
   ...
```

---

#### `check_database_status.py`
**功能**: 测试 Supabase 数据库连接是否正常  
**检查内容**:
- 数据库 URL 是否可达
- API 密钥是否有效
- 网络连接是否正常

**运行频率**: 系统启动时、修复前、修复后

**故障码**:
- `Connection Refused` → Supabase 服务不可用
- `Invalid API Key` → `.env` 配置错误
- `Timeout` → 网络问题

---

### ⚠️ 辅助工具

#### `test_deepseek_api.py`
**功能**: 测试 DeepSeek AI API 连接  
**API 密钥**: `DEEPSEEK_API_KEY` (当前未配置)  
**使用时机**: 需要 AI 功能时

#### `deploy_grich.py`
**功能**: 部署 GRICH 到 AWS Lightsail 服务器  
**SSH 密钥**: 动态路径 `grich-key.pem`  
**使用时机**: 需要更新生产环境时  
**警告**: ⚠️ 生产部署，需谨慎操作

---

## 🔐 依赖的环境变量

### Supabase (必需)
```ini
PUBLIC_SUPABASE_URL=https://rdlmumybuwveaaeceohj.supabase.co
PUBLIC_SUPABASE_ANON_KEY=sb_publishable_aPXWTauRxJ88A88mwLDoPQ_puVi7PZj
```

### DeepSeek AI (可选)
```ini
DEEPSEEK_API_KEY=  # 未配置
```

---

## 🎯 标准诊断流程

### 1️⃣ 健康检查
```
读取 status.md 检查其他 Skill 状态
   ↓
运行 check_database_status.py
   ↓
检查返回状态码
   ↓
记录检查结果到 status.md
```

### 2️⃣ 故障修复
```
识别问题类型（数据库/API/配置）
   ↓
读取相关配置文件（.env/credentials.md）
   ↓
执行修复操作（遵循原子化操作原则）
   ↓
运行 check_supabase_data.py 验证
   ↓
更新 status.md 报告修复结果
```

### 3️⃣ 修复后验证
```
运行 check_supabase_data.py
   ↓
确认记录数未减少
   ↓
抽查 3-5 个案件完整性
   ↓
验证前端页面正常显示
   ↓
标记修复完成
```

---

## 📊 数据库完整性标准

### 必须检查
- ✅ **记录数量**: 不得少于修复前
- ✅ **必填字段**: `brand_name`, `case_number` 不能为空
- ✅ **数据格式**: 案件号符合 `X:YY-cv-XXXXX` 格式

### 警告阈值
- ⚠️ 记录数减少 > 5% → 立即回滚
- ⚠️ 空值字段 > 10% → 数据质量问题
- ⚠️ 重复案件 > 3% → 去重逻辑失效

---

## 🚨 【三道保险 - 防冲突协议】

### 保险 1️⃣: 状态对齐
**规则**: 执行任何操作前，必须先读取根目录的 `status.md`

**检查内容**:
```python
# 伪代码示例
status_path = "d:/quicktoolshub/rader/jaxfamlaw/status.md"
with open(status_path) as f:
    content = f.read()
    if "legal-data-pumper: RUNNING" in content:
        print("⚠️ legal-data-pumper 正在抓取数据，等待...")
        time.sleep(30)  # 短暂等待
```

**冲突处理**:
- 如果发现 `legal-data-pumper` 正在插入数据 → **等待完成**
- 如果需要紧急修复 → 在 `status.md` 标记 `URGENT_FIX`
- 记录到日志: `[时间戳] Waited for data-pumper, then executed repair`

---

### 保险 2️⃣: 原子化操作
**规则**: 修改 `.env` 等核心配置时，严禁直接覆盖，必须先读取差异，仅修改必要行

**正确做法**:
```python
# ✅ 正确的配置修复方式
def fix_env_config(key_to_fix, new_value):
    env_path = "d:/quicktoolshub/rader/jaxfamlaw/grich-astro/.env"
    
    # 读取现有配置
    env_vars = {}
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env_vars[k.strip()] = v.strip()
    
    # 仅修改目标键
    env_vars[key_to_fix] = new_value
    
    # 写回文件（保持原有顺序）
    with open(env_path, 'w', encoding='utf-8') as f:
        for k, v in env_vars.items():
            f.write(f"{k}={v}\n")
    
    print(f"✅ 已修复: {key_to_fix}")

# 使用示例
fix_env_config('PUBLIC_SUPABASE_URL', 'https://new-url.supabase.co')
```

**保护的文件**:
- `.env` - 环境变量配置
- `credentials.md` - API 密钥文档
- `script_manifest.md` - 脚本清单

---

### 保险 3️⃣: 版本保护
**规则**: 禁止直接删除脚本。替换旧脚本前必须先移动到 `scripts/deprecated/`

**修复脚本的归档流程**:
```python
import os
import shutil
from datetime import datetime

def archive_old_script(script_path):
    """归档旧脚本到 deprecated 文件夹"""
    
    # 确保 deprecated 文件夹存在
    deprecated_dir = os.path.join(
        os.path.dirname(script_path), 
        "deprecated"
    )
    os.makedirs(deprecated_dir, exist_ok=True)
    
    # 生成带时间戳的文件名
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = os.path.basename(script_path)
    name, ext = os.path.splitext(filename)
    new_filename = f"{name}_deprecated_{timestamp}{ext}"
    
    # 移动文件
    new_path = os.path.join(deprecated_dir, new_filename)
    shutil.move(script_path, new_path)
    
    print(f"✅ 已归档旧脚本: {new_path}")
    return new_path

# 使用示例
archive_old_script("scripts/broken_script.py")
```

**归档触发条件**:
- 脚本有严重 bug 需要重写
- API 已废弃需要替换方案
- 逻辑过时需要升级

---

## 🩺 常见故障诊断

### 问题 1: 数据库连接失败
**症状**: `check_database_status.py` 返回 Connection Refused

**诊断步骤**:
1. 检查 `.env` 中的 `PUBLIC_SUPABASE_URL`
2. 运行 `ping rdlmumybuwveaaeceohj.supabase.co`
3. 检查防火墙设置

**修复方案**:
```python
# 1. 验证 URL 格式
url = os.getenv('PUBLIC_SUPABASE_URL')
assert url.startswith('https://'), "URL 必须使用 HTTPS"

# 2. 测试网络连接
import requests
response = requests.get(url, timeout=5)
print(f"状态码: {response.status_code}")
```

---

### 问题 2: 数据库记录突然减少
**症状**: `check_supabase_data.py` 显示记录从 398 降到 350

**诊断步骤**:
1. 立即停止所有写入操作
2. 检查 Supabase 后台是否有手动删除
3. 查询 `status.md` 历史记录

**修复方案**:
```sql
-- 如果有备份，从备份恢复
-- 否则标记为数据丢失事件
INSERT INTO incident_log (type, severity, description)
VALUES ('data_loss', 'critical', '48 records missing');
```

---

### 问题 3: API 密钥失效
**症状**: `test_deepseek_api.py` 返回 401 Unauthorized

**诊断步骤**:
1. 检查 `.env` 中的 `DEEPSEEK_API_KEY`
2. 访问 API 提供商验证密钥状态
3. 检查是否欠费或被封禁

**修复方案**:
1. 联系用户获取新密钥
2. 使用原子化操作更新 `.env`
3. 重新运行测试脚本验证

---

## 📝 修复报告模板

每次修复后，必须在 `status.md` 中添加报告：

```markdown
## Legal Site Doctor 修复报告

**修复时间**: 2026-01-25 12:50  
**问题描述**: Supabase 连接超时  
**根本原因**: 网络防火墙阻止 443 端口

**修复步骤**:
1. 检查防火墙配置
2. 添加 supabase.co 到白名单
3. 重启网络服务

**验证结果**:
- ✅ `check_database_status.py` 连接成功
- ✅ `check_supabase_data.py` 查询到 398 条记录
- ✅ 前端页面正常显示

**数据完整性**:
- 修复前记录数: 398
- 修复后记录数: 398
- 数据丢失: 0

**后续建议**: 定期检查防火墙规则，避免类似问题
```

---

## 🔄 与其他 Skill 的协作

### 与 Legal Data Pumper 协作
- **场景**: 数据抓取失败需要诊断
- **协作方式**:
  1. Data Pumper 报告 API 限流 → 
  2. Site Doctor 检查 API 密钥状态 →
  3. Site Doctor 更新 `credentials.md` →
  4. 通知 Data Pumper 重试

### 与 SEO Monitor 协作
- **场景**: 网站流量异常需要排查
- **协作方式**:
  1. SEO Monitor 发现流量下降 →
  2. Site Doctor 检查网站是否宕机 →
  3. Site Doctor 检查数据库性能 →
  4. 修复后通知 SEO Monitor

---

## 📚 相关文档

- **脚本清单**: `.agent/skills/legal-site-doctor/references/script_manifest.md`
- **系统状态**: `status.md` (根目录)
- **API 密钥**: `.agent/skills/legal-site-doctor/references/credentials.md`
- **故障历史**: `.agent/skills/legal-site-doctor/references/incident_log.md` (待创建)

---

## 🎓 技能提升建议

### 自动化健康检查
创建定时任务每小时运行 `check_database_status.py`

### 建立监控告警
当数据库记录数异常波动时自动通知

### 备份策略
定期导出 Supabase 数据到本地备份

---

**最后更新**: 2026-01-25 12:50  
**维护者**: Antigravity AI  
**Skill 版本**: v2.0 (灵魂注入版)

@echo off
echo [Local] 🚀 启动 GRICH 数据猎手 - 本地增强版...
python scripts/local_combat_pumper.py
if %errorlevel% neq 0 (
    echo [ERROR] 脚本运行出错，请联系 Antigravity。
)
pause

@echo off
echo [INFO] 正在初始化 GRICH 本地开工环境...
echo [INFO] 检查 Python 环境...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] 未找到 Python，请先安装 Python 并添加到 PATH。
    pause
    exit /b
)

echo [INFO] 正在安装依赖库 (requirements.txt)...
pip install -r requirements.txt

echo [INFO] 环境安装完毕！
echo [INFO] 您现在可以运行 start_capture.bat 开始抓取。
pause

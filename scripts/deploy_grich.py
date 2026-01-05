import paramiko
from scp import SCPClient
import os
import zipfile
import time

# Server Config (Server C - AWS Lightsail)
HOST = '44.233.82.120'
USER = 'ubuntu'
PW = None
KEY_PATH = r'd:\quicktoolshub\雷达监控。\GRICH\LightsailDefaultKey-us-west-2.pem'
REMOTE_PATH = '/home/ubuntu/grich-web'
LOCAL_PATH = r'd:\quicktoolshub\雷达监控。\GRICH\grich-web'
ZIP_NAME = 'grich-deploy.zip'

def zip_project(source_dir, output_filename):
    print(f"📦 Zipping project from {source_dir}...")
    exclude_dirs = {'node_modules', '.next', '.git', '.vscode'}
    
    with zipfile.ZipFile(output_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            # Modify dirs in-place to skip excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_dir)
                zipf.write(file_path, arcname)
    print(f"✅ Created {output_filename} ({os.path.getsize(output_filename)/1024/1024:.2f} MB)")

def deploy():
    # 1. Zip Local Files
    zip_project(LOCAL_PATH, ZIP_NAME)
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"🔌 Connecting to {HOST}...")
        ssh.connect(HOST, username=USER, key_filename=KEY_PATH)
        
        # 2. Upload Zip
        print("🚀 Uploading deployment package...")
        with SCPClient(ssh.get_transport()) as scp:
            scp.put(ZIP_NAME, f'/home/ubuntu/{ZIP_NAME}')
            
        # 3. Setup Remote Environment & Build
        commands = [
            # Check if node is installed, if not install it (Status: Fresh AWS Server)
            "if ! command -v node &> /dev/null; then curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs; fi",
            # Check if PM2 is installed
            "if ! command -v pm2 &> /dev/null; then sudo npm install pm2 -g; fi",

            f"sudo apt-get install unzip -y",  # Added sudo for ubuntu user
            f"unzip -o /home/ubuntu/{ZIP_NAME} -d {REMOTE_PATH}",
            f"rm /home/ubuntu/{ZIP_NAME}", # Cleanup zip
            f"unzip -o /home/ubuntu/{ZIP_NAME} -d {REMOTE_PATH}",
            f"rm /home/ubuntu/{ZIP_NAME}", # Cleanup zip
            f"cd {REMOTE_PATH} && npm install --legacy-peer-deps", # Re-enabled install
            
            f"cd {REMOTE_PATH} && npm run build",
            
            "echo '🚀 Starting with PM2...'",
            "pm2 delete grich-web || true", 
            # Fix: Force bind to 0.0.0.0 to ensure external access
            f"pm2 start npm --name 'grich-web' --cwd {REMOTE_PATH} -- start -- -p 3005 -H 0.0.0.0",
            "pm2 save"
        ]
        
        # Execute commands sequentially
        for cmd in commands:
            print(f"executing: {cmd}")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            # Streaming output
            while True:
                line = stdout.readline()
                if not line: break
                print(line.strip())
            
            err = stderr.read().decode()
            if err and "warn" not in err.lower() and "notice" not in err.lower(): 
                 # Filter out npm warnings/notices
                print(f"⚠️  {err}")

        print("\n✅ Deployment Command Sequence Completed.")
        print(f"🌍 Verification URL: http://{HOST}:3005/compliance/Nike")

    except Exception as e:
        print(f"❌ Deployment Failed: {e}")
    finally:
        ssh.close()
        # Cleanup local zip
        if os.path.exists(ZIP_NAME):
            os.remove(ZIP_NAME)

if __name__ == "__main__":
    deploy()

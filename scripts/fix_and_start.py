import paramiko
import time

host = '44.233.82.120'
user = 'ubuntu'
key_path = r'd:\quicktoolshub\雷达监控。\GRICH\LightsailDefaultKey-us-west-2.pem'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, key_filename=key_path)

print('=' * 60)
print('Resolving Port 443 Conflict and Starting Nginx')
print('=' * 60)

def execute_cmd(command):
    print(f"\nExecuting: {command}")
    stdin, stdout, stderr = ssh.exec_command(f'echo Baifan100100! | sudo -S {command}')
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out: print(out)
    if err: print(f"Error/Warning: {err}")
    return out

# 1. Stop Xray and Nginx
print("\n--- Stopping services ---")
execute_cmd('systemctl stop xray')
execute_cmd('systemctl stop nginx')
execute_cmd('killall xray') # Force kill if stuck
execute_cmd('killall nginx')

time.sleep(2)

# 2. Check Port 443
print("\n--- Checking Port 443 ---")
stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S ss -tulnp | grep :443')
result = stdout.read().decode()
print(f"Current usage: {result}")

if not result.strip():
    print("✅ Port 443 is free!")
    
    # 3. Start Nginx
    print("\n--- Starting Nginx ---")
    execute_cmd('systemctl start nginx')
    time.sleep(2)
    
    # 4. Check Status
    print("\n--- Nginx Status ---")
    status = execute_cmd('systemctl status nginx --no-pager | head -15')
    
    if 'active (running)' in status:
        print("\n✅ SUCCESS: Nginx is running!")
    else:
        print("\n❌ FAIL: Nginx failed to start. Checking logs...")
        execute_cmd('tail -20 /var/log/nginx/error.log')
else:
    print("❌ Port 443 is STILL in use! Manual intervention required.")
    print(result)

ssh.close()

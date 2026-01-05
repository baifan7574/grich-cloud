import paramiko
import time

host = '44.233.82.120'
user = 'ubuntu'
key_path = r'd:\quicktoolshub\雷达监控。\GRICH\LightsailDefaultKey-us-west-2.pem'

print("=" * 60)
print("AWS SERVER STABILIZATION & CLEANUP")
print("Target: 44.233.82.120 (512MB RAM)")
print("Goal: Remove Web Services, Keep Xray, Check Swap")
print("=" * 60)

ssh = None
MAX_RETRIES = 5
RETRY_DELAY = 10

# Attempt to connect
for attempt in range(MAX_RETRIES):
    try:
        print(f"Connecting to {host}... (Attempt {attempt+1}/{MAX_RETRIES})")
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(host, username=user, key_filename=key_path, timeout=10)
        print("✅ Connected!")
        break
    except Exception as e:
        print(f"⚠️ Connection failed: {e}")
        if attempt < MAX_RETRIES - 1:
            print(f"Retrying in {RETRY_DELAY} seconds...")
            time.sleep(RETRY_DELAY)
        else:
            print("❌ Max retries reached. Server might be down.")
            exit(1)

try:
    def run_sudo(cmd, ignore_error=False):
        print(f"\n> {cmd}")
        try:
            stdin, stdout, stderr = ssh.exec_command(f'echo Baifan100100! | sudo -S {cmd}', timeout=30)
            out = stdout.read().decode().strip()
            err = stderr.read().decode().strip()
            if out: print(out)
            if err and not ignore_error: print(f"  [Log]: {err}")
            return out
        except Exception as e:
            print(f"  [Error]: {e}")
            return ""

    # 1. Stop and Disable Web Services
    print("\n[1/4] Cleaning up Web Services...")
    services_to_kill = ['nginx', 'apache2', 'mysql', 'pm2-ubuntu', 'node']
    
    # Force kill conflicting processes first to free up resources immediately
    run_sudo('killall nginx', ignore_error=True)
    run_sudo('killall node', ignore_error=True)
    run_sudo('pm2 kill', ignore_error=True)

    for svc in ['nginx', 'apache2', 'mysql', 'snap.certbot.renew']:
        run_sudo(f'systemctl stop {svc}', ignore_error=True)
        run_sudo(f'systemctl disable {svc}', ignore_error=True)
        run_sudo(f'systemctl mask {svc}', ignore_error=True) # Prevent accidental start

    # 2. Free up Memory
    print("\n[2/4] Checking Memory & Swap...")
    run_sudo('sync; echo 3 > /proc/sys/vm/drop_caches') # Clear cache
    mem_info = run_sudo('free -h')
    print(mem_info)
    
    # Check if swap exists and is active
    if 'Swap:' in mem_info and '0B' not in mem_info.split('Swap:')[1].split()[0]:
        print("✅ Swap is active.")
    else:
        print("⚠️ Swap might be missing or empty! Attempting to fix...")
        # Check /etc/fstab or try to turn on existing swapfile if widely used path
        run_sudo('swapon -a')

    # 3. Verify Xray Status
    print("\n[3/4] Verifying Xray Service...")
    
    # Check if xray is running
    xray_status = run_sudo('systemctl is-active xray', ignore_error=True)
    if xray_status == 'active':
        print("✅ Xray service is ACTIVE.")
    else:
        print(f"⚠️ Xray service is {xray_status}. Attempting to start...")
        run_sudo('systemctl start xray')
        time.sleep(5)
        xray_status = run_sudo('systemctl is-active xray', ignore_error=True)
        if xray_status == 'active':
             print("✅ Xray started successfully.")
        else:
             print("❌ Xray failed to start. Checking logs...")
             run_sudo('journalctl -u xray --no-pager -n 20')
    
    # Ensure auto-restart
    run_sudo('systemctl enable xray')
    
    # 4. Final Port Check
    print("\n[4/4] Checking Ports (Should only see ssh & xray)...")
    ports = run_sudo('ss -tulnp')
    print(ports)

    # Check if port 443 is listened by xray
    if ':443' in ports and 'xray' in ports:
        print("\n✅ SUCCESS: Xray is listening on port 443.")
    else:
        print("\n⚠️ WARNING: Xray might not be on port 443 or something else is occupying it.")

except Exception as e:
    print(f"\n❌ Execution Error: {e}")

finally:
    if ssh:
        ssh.close()

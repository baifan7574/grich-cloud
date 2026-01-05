import paramiko

SERVERS = [
    # {
    #     'name': 'Server A (NBFive)',
    #     'ip': '43.130.229.184',
    #     'user': 'root',
    #     'pass': 'baifan100100'
    # },
    # {
    #     'name': 'Server B (SoEasyHub)',
    #     'ip': '8.138.115.188',
    #     'user': 'root',
    #     'pass': 'Bai20011018'
    # },
    {
        'name': 'Server C (AWS Lightsail)',
        'ip': '44.233.82.120',
        'user': 'ubuntu',
        'pass': 'Baifan100100!'
    }
]

def check_server(server):
    print(f"\n🔍 Checking {server['name']} ({server['ip']})...")
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(server['ip'], username=server['user'], password=server['pass'], timeout=10)
        
        # Check Node.js
        stdin, stdout, stderr = ssh.exec_command("node -v")
        node_v = stdout.read().decode().strip()
        print(f"   Node.js: {node_v if node_v else 'Not Found'}")
        
        # Check PM2
        stdin, stdout, stderr = ssh.exec_command("pm2 -v")
        pm2_v = stdout.read().decode().strip()
        print(f"   PM2:     {pm2_v if pm2_v else 'Not Found'}")

        # Check Nginx
        stdin, stdout, stderr = ssh.exec_command("nginx -v")
        nginx_v = stderr.read().decode().strip() # Nginx version often outputs to stderr
        print(f"   Nginx:   {nginx_v if nginx_v else 'Not Found'}")
        
        ssh.close()
    except Exception as e:
        print(f"   ❌ Connection Failed: {e}")

if __name__ == "__main__":
    for s in SERVERS:
        check_server(s)

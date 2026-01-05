import paramiko

host = '44.233.82.120'
user = 'ubuntu'
key_path = r'd:\quicktoolshub\雷达监控。\GRICH\LightsailDefaultKey-us-west-2.pem'

def run_debug():
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(host, username=user, key_filename=key_path)

        print('--- 1. Binding Check (Netstat) ---')
        stdin, stdout, stderr = ssh.exec_command('sudo netstat -tulnp | grep 3005')
        print(stdout.read().decode())
        
        print('--- 2. Curl with Host Check ---')
        # Check standard localhost
        cmd1 = 'curl -I http://localhost:3005/compliance/Nike'
        # Check with Public IP Host Header
        cmd2 = 'curl -I -H "Host: 44.233.82.120:3005" http://localhost:3005/compliance/Nike'
        
        for i, cmd in enumerate([cmd1, cmd2]):
            print(f'CMD {i+1}: {cmd}')
            stdin, stdout, stderr = ssh.exec_command(cmd)
            out = stdout.read().decode().strip()
            err = stderr.read().decode().strip()
            print(out)
            if err: print("ERR:", err)
            print("-" * 20)

        ssh.close()
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    run_debug()

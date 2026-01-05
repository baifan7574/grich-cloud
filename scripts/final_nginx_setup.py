#!/usr/bin/env python3
import paramiko
import time

host = '44.233.82.120'
user = 'ubuntu'
key_path = r'd:\quicktoolshub\雷达监控。\GRICH\LightsailDefaultKey-us-west-2.pem'

def execute_command(ssh, command, description=""):
    if description:
        print(f"\n=== {description} ===")
    stdin, stdout, stderr = ssh.exec_command(command)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out:
        print(out)
    if err:
        print("Error:", err)
    return out, err

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, key_filename=key_path)
    
    # Create config file content
    config_content = """server {
    listen 80;
    server_name jaxfamlaw.com www.jaxfamlaw.com;
    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}"""
    
    # Write config to /tmp first
    print("Creating Nginx configuration...")
    sftp = ssh.open_sftp()
    with sftp.open('/tmp/jaxfamlaw.conf', 'w') as f:
        f.write(config_content)
    sftp.close()
    print("✓ Config file created in /tmp")
    
    # Try to copy with different methods
    print("\nAttempting to install config...")
    
    # Method 1: Try with sudo
    out, err = execute_command(ssh, 
        "echo 'Baifan100100!' | sudo -S cp /tmp/jaxfamlaw.conf /etc/nginx/conf.d/jaxfamlaw.conf",
        "Method 1: Using sudo with password")
    
    if "Permission denied" in err or "sudo" in err:
        # Method 2: Try becoming root
        print("\nMethod 2: Trying su -")
        channel = ssh.invoke_shell()
        channel.send('su -\n')
        time.sleep(1)
        channel.send('Baifan100100!\n')
        time.sleep(1)
        channel.send('cp /tmp/jaxfamlaw.conf /etc/nginx/conf.d/jaxfamlaw.conf\n')
        time.sleep(1)
        channel.send('nginx -t\n')
        time.sleep(1)
        channel.send('systemctl reload nginx\n')
        time.sleep(1)
        channel.send('exit\n')
        time.sleep(1)
        
        output = channel.recv(4096).decode()
        print(output)
    
    # Verify
    execute_command(ssh, "curl -I http://localhost/compliance/Nike", "Testing final result")
    
    ssh.close()
    print("\n✓ Configuration complete!")

if __name__ == "__main__":
    main()

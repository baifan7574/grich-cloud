import paramiko

host = '44.233.82.120'
user = 'ubuntu'
key_path = r'd:\quicktoolshub\雷达监控。\GRICH\LightsailDefaultKey-us-west-2.pem'

def configure_nginx():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, key_filename=key_path)

    print('=== Step 1: Restart app on 3005 ===')
    stdin, stdout, stderr = ssh.exec_command('pm2 delete grich-web')
    stdout.read()

    cmd = 'pm2 start npm --name grich-web --cwd /home/ubuntu/grich-web -- start -- -p 3005 -H 0.0.0.0'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode())

    stdin, stdout, stderr = ssh.exec_command('pm2 save')
    stdout.read()
    print('App restarted on port 3005')

    print('\n=== Step 2: Create Nginx Config ===')
    nginx_config = """server {
    listen 80;
    server_name jaxfamlaw.com www.jaxfamlaw.com;

    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}"""

    # Write config using echo
    lines = nginx_config.split('\n')
    # First line creates file
    cmd = f"echo '{lines[0]}' > /tmp/jaxfamlaw.conf"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    stdout.read()
    
    # Append remaining lines
    for line in lines[1:]:
        cmd = f"echo '{line}' >> /tmp/jaxfamlaw.conf"
        stdin, stdout, stderr = ssh.exec_command(cmd)
        stdout.read()

    # Move to nginx sites-available
    stdin, stdout, stderr = ssh.exec_command('sudo mv /tmp/jaxfamlaw.conf /etc/nginx/sites-available/')
    stdout.read()

    # Create symlink
    stdin, stdout, stderr = ssh.exec_command('sudo ln -sf /etc/nginx/sites-available/jaxfamlaw.conf /etc/nginx/sites-enabled/')
    stdout.read()

    # Remove default if exists
    stdin, stdout, stderr = ssh.exec_command('sudo rm -f /etc/nginx/sites-enabled/default')
    stdout.read()

    print('Config created')

    print('\n=== Step 3: Test Nginx Config ===')
    stdin, stdout, stderr = ssh.exec_command('sudo nginx -t')
    out = stdout.read().decode()
    err = stderr.read().decode()
    print(out)
    print(err)

    if 'successful' in err or 'successful' in out:
        print('\n=== Step 4: Reload Nginx ===')
        stdin, stdout, stderr = ssh.exec_command('sudo systemctl reload nginx')
        stdout.read()
        print('Nginx reloaded successfully!')

        print('\n=== Step 5: Verify ===')
        stdin, stdout, stderr = ssh.exec_command('curl -I http://localhost/compliance/Nike')
        print(stdout.read().decode())
    else:
        print('Nginx config test failed!')

    ssh.close()

if __name__ == "__main__":
    configure_nginx()

import paramiko
import time

host = '44.233.82.120'
user = 'ubuntu'
key_path = r'd:\quicktoolshub\雷达监控。\GRICH\LightsailDefaultKey-us-west-2.pem'

def execute_cmd(ssh, cmd, description=""):
    if description:
        print(f"\n=== {description} ===")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out:
        print(out)
    if err and 'warning' not in err.lower():
        print("Error:", err)
    return out, err

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, key_filename=key_path)

print("=" * 60)
print("HTTPS Configuration for jaxfamlaw.com")
print("=" * 60)

# Step 1: Install Certbot
execute_cmd(ssh, 
    "echo Baifan100100! | sudo -S apt update",
    "Step 1: Updating package list")

execute_cmd(ssh,
    "echo Baifan100100! | sudo -S apt install -y certbot python3-certbot-nginx",
    "Step 2: Installing Certbot")

# Step 2: Obtain certificate
print("\n=== Step 3: Obtaining SSL certificate ===")
print("This will use Certbot in standalone mode...")

# Stop nginx temporarily
execute_cmd(ssh,
    "echo Baifan100100! | sudo -S systemctl stop nginx",
    "Stopping Nginx temporarily")

# Get certificate
cert_cmd = """echo Baifan100100! | sudo -S certbot certonly --standalone \\
    --non-interactive \\
    --agree-tos \\
    --email baifan7574@gmail.com \\
    --domains jaxfamlaw.com,www.jaxfamlaw.com"""

out, err = execute_cmd(ssh, cert_cmd, "Obtaining certificate")

# Start nginx again
execute_cmd(ssh,
    "echo Baifan100100! | sudo -S systemctl start nginx",
    "Starting Nginx")

# Step 3: Update Nginx config for HTTPS
print("\n=== Step 4: Configuring Nginx for HTTPS ===")

# Create HTTPS config
config_lines = [
    'server {',
    '    listen 80;',
    '    server_name jaxfamlaw.com www.jaxfamlaw.com;',
    '    return 301 https://$server_name$request_uri;',
    '}',
    '',
    'server {',
    '    listen 443 ssl http2;',
    '    server_name jaxfamlaw.com www.jaxfamlaw.com;',
    '',
    '    ssl_certificate /etc/letsencrypt/live/jaxfamlaw.com/fullchain.pem;',
    '    ssl_certificate_key /etc/letsencrypt/live/jaxfamlaw.com/privkey.pem;',
    '',
    '    location / {',
    '        proxy_pass http://localhost:3005;',
    '        proxy_http_version 1.1;',
    '        proxy_set_header Host $host;',
    '        proxy_set_header X-Real-IP $remote_addr;',
    '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
    '        proxy_set_header X-Forwarded-Proto $scheme;',
    '    }',
    '}'
]

# Write config line by line
for i, line in enumerate(config_lines):
    if i == 0:
        cmd = f'echo "{line}" > /tmp/jaxfamlaw_https.conf'
    else:
        cmd = f'echo "{line}" >> /tmp/jaxfamlaw_https.conf'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    stdout.read()

print("Config file created in /tmp")

# Copy to nginx
execute_cmd(ssh,
    "echo Baifan100100! | sudo -S cp /tmp/jaxfamlaw_https.conf /etc/nginx/conf.d/jaxfamlaw.conf",
    "Installing Nginx config")

# Test nginx config
out, err = execute_cmd(ssh,
    "echo Baifan100100! | sudo -S nginx -t 2>&1",
    "Testing Nginx configuration")

if 'successful' in out or 'successful' in err:
    print("\n✅ Nginx config valid!")
    
    # Reload nginx
    execute_cmd(ssh,
        "echo Baifan100100! | sudo -S systemctl reload nginx",
        "Reloading Nginx")
    
    time.sleep(2)
    
    # Test HTTPS
    print("\n=== Step 5: Testing HTTPS ===")
    execute_cmd(ssh,
        "curl -I https://localhost/compliance/Nike 2>&1 | head -5",
        "Testing HTTPS locally")
    
    print("\n" + "=" * 60)
    print("✅ HTTPS Configuration Complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Go to Cloudflare DNS settings")
    print("2. Enable orange cloud for jaxfamlaw.com")
    print("3. Go to Cloudflare SSL/TLS settings")
    print("4. Set encryption mode to 'Full (strict)'")
    print("5. Visit: https://jaxfamlaw.com/compliance/Nike")
else:
    print("\n❌ Nginx config test failed!")
    execute_cmd(ssh, "cat /tmp/jaxfamlaw_https.conf", "Showing config file")

ssh.close()

import paramiko
import time

host = '44.233.82.120'
user = 'ubuntu'
key_path = r'd:\quicktoolshub\雷达监控。\GRICH\LightsailDefaultKey-us-west-2.pem'

print("=" * 60)
print("Waiting for DNS propagation and obtaining SSL certificate")
print("=" * 60)

# Wait for DNS to propagate
print("\nWaiting 2 minutes for DNS to propagate...")
print("(DNS changes can take time to propagate globally)")

for i in range(12):
    time.sleep(10)
    print(f"  {(i+1)*10} seconds elapsed...")

print("\n✓ Wait complete. Attempting certificate generation...\n")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, key_filename=key_path)

# Ensure webroot directory exists
print("=== Setting up webroot directory ===")
stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S mkdir -p /var/www/html/.well-known/acme-challenge')
stdout.read()
stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S chmod -R 755 /var/www/html')
stdout.read()
print("✓ Webroot directory ready")

# Get certificate using webroot
print("\n=== Obtaining SSL certificate ===")
cert_cmd = """echo Baifan100100! | sudo -S certbot certonly --webroot \\
    -w /var/www/html \\
    --non-interactive \\
    --agree-tos \\
    --email baifan7574@gmail.com \\
    -d jaxfamlaw.com -d www.jaxfamlaw.com 2>&1"""

stdin, stdout, stderr = ssh.exec_command(cert_cmd)
result = stdout.read().decode()
print(result)

if 'Successfully received certificate' in result or 'Certificate is saved' in result:
    print('\n' + "=" * 60)
    print("✅ Certificate obtained successfully!")
    print("=" * 60)
    
    # Configure Nginx for HTTPS
    print("\n=== Configuring Nginx for HTTPS ===")
    
    https_config = """server {
    listen 80;
    server_name jaxfamlaw.com www.jaxfamlaw.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2 default_server;
    server_name jaxfamlaw.com www.jaxfamlaw.com;
    
    ssl_certificate /etc/letsencrypt/live/jaxfamlaw.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jaxfamlaw.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}"""
    
    lines = https_config.split('\n')
    for i, line in enumerate(lines):
        if i == 0:
            cmd = f'echo "{line}" > /tmp/jax_https_final.conf'
        else:
            cmd = f'echo "{line}" >> /tmp/jax_https_final.conf'
        stdin, stdout, stderr = ssh.exec_command(cmd)
        stdout.read()
    
    stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S cp /tmp/jax_https_final.conf /etc/nginx/conf.d/jaxfamlaw.conf')
    stdout.read()
    
    # Test nginx config
    stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S nginx -t 2>&1')
    test_result = stdout.read().decode()
    print(test_result)
    
    if 'successful' in test_result:
        print("\n✓ Nginx configuration valid")
        
        # Reload nginx
        stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S systemctl reload nginx')
        stdout.read()
        print("✓ Nginx reloaded")
        
        # Test HTTPS
        time.sleep(2)
        print("\n=== Testing HTTPS ===")
        stdin, stdout, stderr = ssh.exec_command('curl -I https://localhost/compliance/Nike 2>&1 | head -10')
        print(stdout.read().decode())
        
        print("\n" + "=" * 60)
        print("✅ HTTPS Configuration Complete!")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Go to Cloudflare DNS and re-enable orange cloud")
        print("2. Go to Cloudflare SSL/TLS settings")
        print("3. Set encryption mode to 'Full (strict)'")
        print("4. Visit: https://jaxfamlaw.com/compliance/Nike")
    else:
        print("\n❌ Nginx configuration test failed")
else:
    print("\n❌ Certificate generation failed")
    print("This might be because DNS hasn't propagated yet.")
    print("Please wait a few more minutes and try again.")

ssh.close()

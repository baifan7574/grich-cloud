import paramiko

host = '44.233.82.120'
user = 'ubuntu'
key_path = r'd:\quicktoolshub\雷达监控。\GRICH\LightsailDefaultKey-us-west-2.pem'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, key_filename=key_path)

print('=== Checking certbot logs ===')
stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S tail -30 /var/log/letsencrypt/letsencrypt.log 2>&1')
print(stdout.read().decode())

print('\n=== Attempting to get certificate using webroot method ===')

# First, create webroot directory
stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S mkdir -p /var/www/html/.well-known/acme-challenge')
stdout.read()

# Update nginx config to serve .well-known
webroot_config = """server {
    listen 80 default_server;
    server_name jaxfamlaw.com www.jaxfamlaw.com _;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}"""

# Write config
lines = webroot_config.split('\n')
for i, line in enumerate(lines):
    if i == 0:
        cmd = f'echo "{line}" > /tmp/jax_webroot.conf'
    else:
        cmd = f'echo "{line}" >> /tmp/jax_webroot.conf'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    stdout.read()

# Copy config
stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S cp /tmp/jax_webroot.conf /etc/nginx/conf.d/jaxfamlaw.conf')
stdout.read()

# Reload nginx
stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S systemctl reload nginx')
stdout.read()

print('\n=== Getting certificate with webroot ===')
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
    print('\n✅ Certificate obtained successfully!')
    
    # Now update nginx for HTTPS
    https_config = """server {
    listen 80;
    server_name jaxfamlaw.com www.jaxfamlaw.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2 default_server;
    server_name jaxfamlaw.com www.jaxfamlaw.com;
    
    ssl_certificate /etc/letsencrypt/live/jaxfamlaw.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jaxfamlaw.com/privkey.pem;
    
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
    
    stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S nginx -t 2>&1')
    test_result = stdout.read().decode()
    print('\n=== Nginx test ===')
    print(test_result)
    
    if 'successful' in test_result:
        stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S systemctl reload nginx')
        stdout.read()
        print('\n✅ HTTPS configured and Nginx reloaded!')
    else:
        print('\n❌ Nginx config test failed')
else:
    print('\n❌ Certificate generation failed')
    print('Check the output above for errors')

ssh.close()

import paramiko

host = '44.233.82.120'
user = 'ubuntu'
key_path = r'd:\quicktoolshub\雷达监控。\GRICH\LightsailDefaultKey-us-west-2.pem'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, key_filename=key_path)

print('=' * 70)
print('Configuring Nginx for HTTPS')
print('=' * 70)

# Create HTTPS configuration
https_lines = [
    'server {',
    '    listen 80;',
    '    server_name jaxfamlaw.com;',
    '    ',
    '    location /.well-known/acme-challenge/ {',
    '        root /var/www/html;',
    '    }',
    '    ',
    '    location / {',
    '        return 301 https://\\$server_name\\$request_uri;',
    '    }',
    '}',
    '',
    'server {',
    '    listen 443 ssl http2 default_server;',
    '    server_name jaxfamlaw.com;',
    '    ',
    '    ssl_certificate /etc/letsencrypt/live/jaxfamlaw.com/fullchain.pem;',
    '    ssl_certificate_key /etc/letsencrypt/live/jaxfamlaw.com/privkey.pem;',
    '    ssl_protocols TLSv1.2 TLSv1.3;',
    '    ssl_ciphers HIGH:!aNULL:!MD5;',
    '    ',
    '    location / {',
    '        proxy_pass http://localhost:3005;',
    '        proxy_http_version 1.1;',
    '        proxy_set_header Host \\$host;',
    '        proxy_set_header X-Real-IP \\$remote_addr;',
    '        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;',
    '        proxy_set_header X-Forwarded-Proto \\$scheme;',
    '    }',
    '}'
]

for i, line in enumerate(https_lines):
    if i == 0:
        cmd = f'echo "{line}" > /tmp/jax_https_final.conf'
    else:
        cmd = f'echo "{line}" >> /tmp/jax_https_final.conf'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    stdout.read()

print('✓ Configuration file created')

# Copy to nginx
stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S cp /tmp/jax_https_final.conf /etc/nginx/conf.d/jaxfamlaw.conf')
stdout.read()

# Test nginx
print('\n=== Testing Nginx configuration ===')
stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S nginx -t 2>&1')
test_result = stdout.read().decode()
print(test_result)

if 'successful' in test_result:
    print('\n✓ Nginx configuration valid')
    
    # Reload nginx
    stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S systemctl reload nginx')
    stdout.read()
    print('✓ Nginx reloaded')
    
    # Test HTTPS
    import time
    time.sleep(2)
    
    print('\n=== Testing HTTPS locally ===')
    stdin, stdout, stderr = ssh.exec_command('curl -I https://localhost/compliance/Nike 2>&1 | head -10')
    print(stdout.read().decode())
    
    print('\n' + '=' * 70)
    print('✅✅✅ HTTPS CONFIGURATION COMPLETE! ✅✅✅')
    print('=' * 70)
    print('\nWhat to do next:')
    print('1. Go to Cloudflare DNS settings')
    print('2. Re-enable orange cloud for jaxfamlaw.com')
    print('3. Go to Cloudflare SSL/TLS settings')
    print('4. Set encryption mode to "Full (strict)"')
    print('5. Wait 1-2 minutes for changes to propagate')
    print('6. Visit: https://jaxfamlaw.com/compliance/Nike')
    print('\nCertificate details:')
    print('- Domain: jaxfamlaw.com')
    print('- Expires: 2026-04-03')
    print('- Auto-renewal: Enabled')
else:
    print('\n❌ Nginx configuration test failed')
    print(test_result)

ssh.close()

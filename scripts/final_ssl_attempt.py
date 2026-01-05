import paramiko

host = '44.233.82.120'
user = 'ubuntu'
key_path = r'd:\quicktoolshub\雷达监控。\GRICH\LightsailDefaultKey-us-west-2.pem'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, key_filename=key_path)

print('=' * 70)
print('FINAL ATTEMPT: SSL Certificate Generation')
print('=' * 70)

print('\n=== Retrying certificate generation ===')
cert_cmd = 'echo Baifan100100! | sudo -S certbot certonly --webroot -w /var/www/html --non-interactive --agree-tos --email baifan7574@gmail.com -d jaxfamlaw.com -d www.jaxfamlaw.com --force-renewal 2>&1'

stdin, stdout, stderr = ssh.exec_command(cert_cmd)
result = stdout.read().decode()
print(result)

if 'Successfully received certificate' in result or 'Certificate is saved' in result:
    print('\n' + '=' * 70)
    print('✅✅✅ SUCCESS! Certificate obtained! ✅✅✅')
    print('=' * 70)
    
    # Configure HTTPS
    print('\n=== Configuring Nginx for HTTPS ===')
    
    https_lines = [
        'server {',
        '    listen 80;',
        '    server_name jaxfamlaw.com www.jaxfamlaw.com;',
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
        '    server_name jaxfamlaw.com www.jaxfamlaw.com;',
        '    ',
        '    ssl_certificate /etc/letsencrypt/live/jaxfamlaw.com/fullchain.pem;',
        '    ssl_certificate_key /etc/letsencrypt/live/jaxfamlaw.com/privkey.pem;',
        '    ssl_protocols TLSv1.2 TLSv1.3;',
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
            cmd = f'echo "{line}" > /tmp/jax_https.conf'
        else:
            cmd = f'echo "{line}" >> /tmp/jax_https.conf'
        stdin, stdout, stderr = ssh.exec_command(cmd)
        stdout.read()
    
    stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S cp /tmp/jax_https.conf /etc/nginx/conf.d/jaxfamlaw.conf')
    stdout.read()
    
    stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S nginx -t 2>&1')
    test = stdout.read().decode()
    print(test)
    
    if 'successful' in test:
        stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S systemctl reload nginx')
        stdout.read()
        print('\n✅ Nginx reloaded with HTTPS configuration!')
        
        print('\n' + '=' * 70)
        print('🎉 HTTPS CONFIGURATION COMPLETE! 🎉')
        print('=' * 70)
        print('\nNext steps:')
        print('1. Go to Cloudflare and re-enable orange cloud')
        print('2. Set SSL/TLS mode to "Full (strict)"')
        print('3. Visit: https://jaxfamlaw.com/compliance/Nike')
    else:
        print('\n❌ Nginx config test failed')
else:
    print('\n❌ Certificate generation failed again')
    print('\nPossible reasons:')
    print('- DNS still pointing to Cloudflare')
    print('- Rate limit from Let''s Encrypt')
    print('- Firewall blocking Let''s Encrypt servers')

ssh.close()

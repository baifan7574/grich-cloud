import paramiko

host = '44.233.82.120'
user = 'ubuntu'
key_path = r'd:\quicktoolshub\雷达监控。\GRICH\LightsailDefaultKey-us-west-2.pem'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, key_filename=key_path)

print('=== Creating correct Nginx configuration ===')

# Create config line by line to avoid escaping issues
commands = [
    'echo "server {" > /tmp/jax_fixed.conf',
    'echo "    listen 80 default_server;" >> /tmp/jax_fixed.conf',
    'echo "    server_name jaxfamlaw.com www.jaxfamlaw.com _;" >> /tmp/jax_fixed.conf',
    'echo "" >> /tmp/jax_fixed.conf',
    'echo "    location /.well-known/acme-challenge/ {" >> /tmp/jax_fixed.conf',
    'echo "        root /var/www/html;" >> /tmp/jax_fixed.conf',
    'echo "        try_files \\$uri =404;" >> /tmp/jax_fixed.conf',
    'echo "    }" >> /tmp/jax_fixed.conf',
    'echo "" >> /tmp/jax_fixed.conf',
    'echo "    location / {" >> /tmp/jax_fixed.conf',
    'echo "        proxy_pass http://localhost:3005;" >> /tmp/jax_fixed.conf',
    'echo "        proxy_http_version 1.1;" >> /tmp/jax_fixed.conf',
    'echo "        proxy_set_header Host \\$host;" >> /tmp/jax_fixed.conf',
    'echo "        proxy_set_header X-Real-IP \\$remote_addr;" >> /tmp/jax_fixed.conf',
    'echo "    }" >> /tmp/jax_fixed.conf',
    'echo "}" >> /tmp/jax_fixed.conf'
]

for cmd in commands:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    stdout.read()

print('✓ Config file created')

# Show config
print('\n=== New configuration ===')
stdin, stdout, stderr = ssh.exec_command('cat /tmp/jax_fixed.conf')
print(stdout.read().decode())

# Copy to nginx
stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S cp /tmp/jax_fixed.conf /etc/nginx/conf.d/jaxfamlaw.conf')
stdout.read()

# Test nginx
print('\n=== Testing Nginx ===')
stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S nginx -t 2>&1')
result = stdout.read().decode()
print(result)

if 'successful' in result:
    # Reload nginx
    stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S systemctl reload nginx')
    stdout.read()
    print('\n✓ Nginx reloaded')
    
    # Create test file
    stdin, stdout, stderr = ssh.exec_command('echo "test123" | sudo tee /var/www/html/.well-known/acme-challenge/test.txt > /dev/null')
    stdout.read()
    
    # Test webroot
    print('\n=== Testing webroot access ===')
    stdin, stdout, stderr = ssh.exec_command('curl http://localhost/.well-known/acme-challenge/test.txt 2>&1')
    test_result = stdout.read().decode()
    print(test_result)
    
    if 'test123' in test_result:
        print('\n✅ Webroot is working! Now attempting certificate generation...')
        
        # Get certificate
        cert_cmd = """echo Baifan100100! | sudo -S certbot certonly --webroot \\
            -w /var/www/html \\
            --non-interactive \\
            --agree-tos \\
            --email baifan7574@gmail.com \\
            -d jaxfamlaw.com -d www.jaxfamlaw.com 2>&1"""
        
        stdin, stdout, stderr = ssh.exec_command(cert_cmd)
        cert_result = stdout.read().decode()
        print('\n=== Certificate generation result ===')
        print(cert_result)
        
        if 'Successfully received certificate' in cert_result or 'Certificate is saved' in cert_result:
            print('\n✅ Certificate obtained!')
        else:
            print('\n❌ Certificate generation failed')
    else:
        print('\n❌ Webroot still not working')

ssh.close()

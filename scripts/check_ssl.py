import paramiko

host = '44.233.82.120'
user = 'ubuntu'
key_path = r'd:\quicktoolshub\雷达监控。\GRICH\LightsailDefaultKey-us-west-2.pem'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, key_filename=key_path)

print('=== 1. Check for SSL certificates ===')
stdin, stdout, stderr = ssh.exec_command('ls -la /etc/letsencrypt/live/ 2>&1')
result = stdout.read().decode()
print(result if 'total' in result else 'No Lets Encrypt certificates found')

print('\n=== 2. Check for SSL certificate files ===')
stdin, stdout, stderr = ssh.exec_command('find /etc/ssl /etc/nginx -name "*.crt" -o -name "*.pem" 2>/dev/null | head -20')
result = stdout.read().decode()
print(result if result.strip() else 'No certificate files found')

print('\n=== 3. Check Nginx SSL configurations ===')
stdin, stdout, stderr = ssh.exec_command('grep -r "ssl_certificate" /etc/nginx/ 2>&1 | head -20')
result = stdout.read().decode()
print(result if result.strip() else 'No SSL configurations found in Nginx')

print('\n=== 4. Check if certbot is installed ===')
stdin, stdout, stderr = ssh.exec_command('which certbot 2>&1')
certbot_path = stdout.read().decode().strip()
if certbot_path and 'certbot' in certbot_path:
    print(f'✓ Certbot installed at: {certbot_path}')
    # Check certbot version
    stdin, stdout, stderr = ssh.exec_command('certbot --version 2>&1')
    print(stdout.read().decode())
else:
    print('✗ Certbot not installed')

print('\n=== 5. Check existing domains with certificates ===')
stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S certbot certificates 2>&1')
result = stdout.read().decode()
print(result if result.strip() else 'No certificates managed by certbot')

ssh.close()

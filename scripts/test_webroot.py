import paramiko

host = '44.233.82.120'
user = 'ubuntu'
key_path = r'd:\quicktoolshub\雷达监控。\GRICH\LightsailDefaultKey-us-west-2.pem'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, key_filename=key_path)

print('=== Creating test file in webroot ===')
stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S mkdir -p /var/www/html/.well-known/acme-challenge')
stdout.read()
stdin, stdout, stderr = ssh.exec_command('echo "test123" | sudo tee /var/www/html/.well-known/acme-challenge/test.txt > /dev/null')
stdout.read()
stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S chmod -R 755 /var/www/html')
stdout.read()

print('\n=== Testing from server itself ===')
stdin, stdout, stderr = ssh.exec_command('curl http://localhost/.well-known/acme-challenge/test.txt 2>&1')
result = stdout.read().decode()
print(result)

if 'test123' in result:
    print('✓ Webroot is accessible from localhost')
else:
    print('✗ Webroot NOT accessible - Nginx config issue')
    
print('\n=== Current Nginx config ===')
stdin, stdout, stderr = ssh.exec_command('cat /etc/nginx/conf.d/jaxfamlaw.conf')
print(stdout.read().decode())

ssh.close()

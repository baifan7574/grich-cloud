import paramiko

host = '44.233.82.120'
user = 'ubuntu'
key_path = r'd:\quicktoolshub\雷达监控。\GRICH\LightsailDefaultKey-us-west-2.pem'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, key_filename=key_path)

print('=== Creating config using server-side commands ===')

commands = [
    'echo "server {" > /tmp/jax.conf',
    'echo "    listen 80 default_server;" >> /tmp/jax.conf',
    'echo "    server_name jaxfamlaw.com www.jaxfamlaw.com _;" >> /tmp/jax.conf',
    'echo "    location / {" >> /tmp/jax.conf',
    'echo "        proxy_pass http://localhost:3005;" >> /tmp/jax.conf',
    'echo "        proxy_http_version 1.1;" >> /tmp/jax.conf',
    'echo "        proxy_set_header Host \\$host;" >> /tmp/jax.conf',
    'echo "    }" >> /tmp/jax.conf',
    'echo "}" >> /tmp/jax.conf'
]

for cmd in commands:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    stdout.read()

print('Config created in /tmp/jax.conf')

print('\n=== Verify config content ===')
stdin, stdout, stderr = ssh.exec_command('cat /tmp/jax.conf')
print(stdout.read().decode())

print('\n=== Copy to nginx ===')
stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S cp /tmp/jax.conf /etc/nginx/conf.d/jaxfamlaw.conf')
stdout.read()

print('\n=== Test nginx ===')
stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S nginx -t 2>&1')
result = stdout.read().decode()
print(result)

if 'successful' in result:
    print('\n✅ Config valid! Reloading...')
    stdin, stdout, stderr = ssh.exec_command('echo Baifan100100! | sudo -S systemctl reload nginx')
    stdout.read()
    
    import time
    time.sleep(2)
    
    print('\n=== Final test ===')
    stdin, stdout, stderr = ssh.exec_command('curl -I http://localhost/compliance/Nike')
    print(stdout.read().decode())

ssh.close()

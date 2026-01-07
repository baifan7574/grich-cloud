import urllib.request
import json
import ssl

# Ignore SSL certificate errors for local/tunnel testing if needed, though localtunnel usually has valid certs.
# But just in case of environment weirdness.
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://eighty-roses-drum.loca.lt/webhook-test/gemini-update"
data = {
  "owner": "baifan7574",
  "repo": "grich-cloud",
  "path": "BRIDGE_TEST.md",
  "content": "# 自动化大桥通车测试成功！\n\n老板，当你看到这个文件时，说明 CTO (Gemini) 的指令已经穿过 n8n，准确降落在你的仓库里了。",
  "message": "Initial Bridge Test from Gemini"
}

headers = {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
    'User-Agent': 'Gemini-Agent'
}

req = urllib.request.Request(url, headers=headers, method="POST")
json_data = json.dumps(data).encode('utf-8')

print(f"Sending POST to {url}...")
try:
    with urllib.request.urlopen(req, data=json_data, context=ctx) as response:
        print(f"Status Code: {response.status}")
        print("Response Body:")
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")

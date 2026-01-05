import socket

domain = "jaxfamlaw.com"
expected_ip = "43.130.229.184"

print(f"🔍 Checking DNS for {domain}...")

try:
    ip = socket.gethostbyname(domain)
    print(f"👉 Resolved IP: {ip}")
    
    if ip == expected_ip:
        print("✅ SUCCESS: Domain is pointing to Tencent Server!")
    else:
        print(f"❌ MISMATCH: Domain is pointing to {ip}, expected {expected_ip}")
        print("   (Note: DNS propagation usually takes 5-30 mins, sometimes up to 24h)")
        
except Exception as e:
    print(f"⚠️ Resolution Failed: {e}")

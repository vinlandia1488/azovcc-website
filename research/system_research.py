import subprocess
import re

# research state management
state = {
    "is_mocked": False,
    "mock_values": {}
}

def run_command(cmd):
    """helper to execute shell commands and return clean output"""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, shell=True)
        return result.stdout.strip()
    except Exception:
        return None

def get_native_hwid():
    """retrieves the actual hardware uuid from windows"""
    raw = run_command("wmic csproduct get uuid")
    if raw:
        # find uuid pattern using regex
        match = re.search(r'[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}', raw, re.I)
        if match:
            return match.group(0)
    return "unknown-hwid"

def get_native_mac():
    """retrieves the primary network adapter physical address"""
    raw = run_command("getmac /fo list /v")
    if raw:
        match = re.search(r'Physical Address:\s+([0-9A-F-]+)', raw, re.I)
        if match:
            return match.group(1)
    return "00-00-00-00-00-00"

def get_hardware_id():
    """the function targeted by research (hookable)"""
    if state["is_mocked"] and "hwid" in state["mock_values"]:
        return state["mock_values"]["hwid"]
    return get_native_hwid()

def get_mac_address():
    """the function targeted by research (hookable)"""
    if state["is_mocked"] and "mac" in state["mock_values"]:
        return state["mock_values"]["mac"]
    return get_native_mac()

def execute_security_audit():
    """simulates an application performing a hardware-bound security check"""
    current_hwid = get_hardware_id()
    current_mac = get_mac_address()
    
    print(f" [audit] hwid detected: {current_hwid}")
    print(f" [audit] mac detected:  {current_mac}")
    
    # example research whitelist
    whitelist = ["550e8400-e29b-41d4-a716-446655440000"]
    
    if current_hwid in whitelist:
        print(" [result] environment: authorized (virtual/mock match)")
    else:
        print(" [result] environment: native/unrecognized")

def main():
    print("="*60)
    print(" python system identifier research & simulation tool")
    print("="*60)
    
    # phase 1: native state
    print("\n[step 1] analyzing native host identifiers (before mock)")
    execute_security_audit()
    
    # phase 2: mock configuration
    print("\n[step 2] initializing virtualization simulation layer...")
    state["mock_values"]["hwid"] = "550e8400-e29b-41d4-a716-446655440000"
    state["mock_values"]["mac"] = "DE-AD-BE-EF-CA-FE"
    state["is_mocked"] = True
    print(" [system] mock layer activated.")
    
    # phase 3: mocked state
    print("\n[step 3] analyzing simulated identifiers (after mock)")
    execute_security_audit()
    
    print("\n" + "="*60)

if __name__ == "__main__":
    main()

-- system_research.lua
-- educational script for exploring system identifier detection and simulation
-- purpose: virtualization research and software testing environments

local state = {
    cache = {},
    is_mocked = false,
    mock_values = {}
}

-- helper: execute system commands via shell
local function run_shell(cmd)
    local pipe = io.popen(cmd)
    if not pipe then return nil end
    local output = pipe:read("*a")
    pipe:close()
    return output:match("^%s*(.-)%s*$")
end

-- retrieve native hardware uuid
local function get_native_hwid()
    local raw = run_shell("wmic csproduct get uuid")
    if raw then
        return raw:match("%w%w%w%w%w%w%w%w%-%w%w%w%w%-%w%w%w%w%-%w%w%w%w%-%w%w%w%w%w%w%w%w%w%w%w%w") or "unknown"
    end
    return "error"
end

-- retrieve native mac address
local function get_native_mac()
    local raw = run_shell("getmac /fo list /v")
    if raw then
        return raw:match("Physical Address:%s+([%w%-]+)") or "00-00-00-00-00-00"
    end
    return "00-00-00-00-00-00"
end

-- core detection functions (can be hooked for research)
local function get_hardware_id()
    return get_native_hwid()
end

local function get_mac_address()
    return get_native_mac()
end

-- research: function hooking demonstration
-- this simulates how a virtualization layer or 'spoof' might intercept calls
local function apply_research_hooks()
    print("\n[research] applying api hooks for identifier redirection...")
    
    -- store originals
    local original_hwid = get_hardware_id
    local original_mac  = get_mac_address
    
    -- redirect hardware id
    get_hardware_id = function()
        if state.is_mocked then
            return state.mock_values.hwid
        end
        return original_hwid()
    end
    
    -- redirect mac address
    get_mac_address = function()
        if state.is_mocked then
            return state.mock_values.mac
        end
        return original_mac()
    end
    
    print("[research] hooks installed successfully.")
end

-- simulation: application-level security check
local function execute_identity_verification()
    print("\n[app] starting identity verification...")
    
    local hwid = get_hardware_id()
    local mac  = get_mac_address()
    
    print(string.format(" [app] detected hwid: %s", hwid))
    print(string.format(" [app] detected mac:  %s", mac))
    
    -- demo whitelist
    local whitelist = {
        ["550e8400-e29b-41d4-a716-446655440000"] = true
    }
    
    if whitelist[hwid] then
        print("[app] result: authorized.")
    else
        print("[app] result: unauthorized device.")
    end
end

-- entry point
local function main()
    print("====================================================")
    print(" system identifier research & simulation tool")
    print("====================================================")
    
    -- 1. show native data
    print("\n--- step 1: native environment analysis ---")
    execute_identity_verification()
    
    -- 2. apply hooks (research technique)
    apply_research_hooks()
    
    -- 3. activate mock layer
    state.mock_values.hwid = "550e8400-e29b-41d4-a716-446655440000"
    state.mock_values.mac  = "DE-AD-BE-EF-CA-FE"
    state.is_mocked = true
    
    -- 4. test intercepted environment
    print("\n--- step 2: simulated environment analysis ---")
    execute_identity_verification()
    
    print("\n====================================================")
end

main()

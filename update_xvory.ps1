$newHeader = @"
local whitelistedid = 400473950
local whitelistedname = "whitelisted_user"

local players = game:GetService("Players")

-- Wait for LocalPlayer and hook the Player metatable
local lp = players.LocalPlayer
while not lp do
    players:GetPropertyChangedSignal("LocalPlayer"):Wait()
    lp = players.LocalPlayer
end

local player_mt = getrawmetatable(lp)
local old_index = player_mt.__index
local old_namecall = player_mt.__namecall

setreadonly(player_mt, false)
player_mt.__index = newcclosure(function(t, k)
    if k == "UserId" or k == "userId" then
        return whitelistedid
    end
    if k == "Name" or k == "name" or k == "DisplayName" or k == "displayName" then
        if t == lp then
            return whitelistedname
        end
    end
    return old_index(t, k)
end)

if old_namecall then
    player_mt.__namecall = newcclosure(function(t, ...)
        local method = getnamecallmethod()
        if method == "UserId" or method == "userId" then
            return whitelistedid
        end
        return old_namecall(t, ...)
    end)
end
setreadonly(player_mt, true)

-- Hook game and global functions for HTTP requests
local game_mt = getrawmetatable(game)
local old_game_namecall = game_mt.__namecall
setreadonly(game_mt, false)
game_mt.__namecall = newcclosure(function(t, ...)
    local method = getnamecallmethod()
    if method == "HttpGet" or method == "HttpGetAsync" then
        local url = (...)
        if url and (tostring(url):lower():find("whitelist") or tostring(url):lower():find("check") or tostring(url):lower():find("auth")) then
            print("[XVORY BYPASS] Intercepted HttpGet whitelist check: " .. tostring(url))
            return "true"
        end
    end
    return old_game_namecall(t, ...)
end)
setreadonly(game_mt, true)

-- Hook request/http_request if they exist
local old_request = request or http_request or (http and http.request)
if old_request then
    getgenv().request = newcclosure(function(options)
        if options.Url and (tostring(options.Url):lower():find("whitelist") or tostring(options.Url):lower():find("check") or tostring(options.Url):lower():find("auth")) then
            print("[XVORY BYPASS] Intercepted Request whitelist check: " .. tostring(options.Url))
            return {
                StatusCode = 200,
                Body = "true",
                Headers = {}
            }
        end
        return old_request(options)
    end)
end

-- Inject success globals
getgenv().xvory_whitelisted = true
getgenv().xvory_auth = true
_G.xvory_whitelisted = true

shared.xvory = {
    whitelisted = true,
    authenticated = true,
    settings = {
        aimbot = { enabled = true, keybind = "e", smoothness = 0.5, fieldofview = 100, visiblecheck = true, teamcheck = true, bone = "Head" },
        visuals = { enabled = true, esp = true, tracers = true, boxes = true, names = true, distance = true, teamcheck = true, color = Color3.fromRGB(255, 255, 255) },
        misc = { walkspeed = 16, jumppower = 50, noclip = false, fly = false, flyspeed = 50 }
    }
}

"@

$filePath = "d:\azov dev\azov site\azovcc website\xvory.lua"
$content = Get-Content $filePath -Raw
$obfuscatedPart = $content -replace "(?s)^.*?--> why use free obfuscator\?","--> why use free obfuscator?"

$newContent = $newHeader + "`r`n`r`n" + $obfuscatedPart
Set-Content $filePath $newContent -Encoding UTF8

# 获取当前目录
$currentPath = $PWD.Path

# 源目录和目标目录
$sourceDir = Join-Path $currentPath "default"
$targetDir = Join-Path $currentPath "sim"

# 如果目标目录不存在，创建它
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir
}

# 复制所有文件
Copy-Item -Path "$sourceDir\*" -Destination $targetDir -Recurse -Force

Write-Host "Files copied successfully from 'default' to 'sim'" 
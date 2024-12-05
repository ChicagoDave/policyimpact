# Location: ./scripts/combineFiles.ps7.ps1

[string[]]$excludePatterns = @(
    'node_modules',
    'package-lock.json',
    '\.next',
    'dist',
    'build',
    '\.git',
    '\.env',
    '\.DS_Store',
    '\.js\.map$',
    '\.d\.ts$',
    'coverage',
    '\.cache',
    '.*\.test\.',
    '.*\.spec\.',
    '\.vs',
    '\.vscode'
)

$rootPath = Join-Path (Get-Location) "pi-share"

# First get all subdirectories two levels deep
$subdirs = Get-ChildItem -Path $rootPath -Directory | 
    ForEach-Object {
        $firstLevel = $_.Name
        Get-ChildItem -Path $_.FullName -Directory | 
        ForEach-Object {
            @{
                Path = $_.FullName
                OutputFile = "policyimpact-$firstLevel-$($_.Name).txt"
            }
        }
    }

# Process each subdirectory
foreach ($dir in $subdirs) {
    $outputFile = Join-Path (Get-Location) $dir.OutputFile
    
    if (Test-Path $outputFile) {
        Remove-Item $outputFile -Force
    }

    Get-ChildItem -Path $dir.Path -Recurse -File | 
        Where-Object { 
            $file = $_
            -not ($excludePatterns.Where({ $file.FullName -match $_ }))
        } | ForEach-Object {
            $relativePath = $_.FullName.Replace("$rootPath\", "")
            @"

// File: $relativePath

$((Get-Content $_.FullName -Raw))

// =================

"@ | Add-Content -Path $outputFile
        }

    Write-Output "Created $($dir.OutputFile)"
}

# Also handle root and first-level files
$rootFiles = Get-ChildItem -Path $rootPath -File |
    Where-Object { 
        $file = $_
        -not ($excludePatterns.Where({ $file.FullName -match $_ }))
    }

if ($rootFiles) {
    $rootOutput = Join-Path (Get-Location) "policyimpact-root.txt"
    foreach ($file in $rootFiles) {
        $relativePath = $file.FullName.Replace("$rootPath\", "")
        @"

// File: $relativePath

$((Get-Content $file.FullName -Raw))

// =================

"@ | Add-Content -Path $rootOutput
    }
    Write-Output "Created policyimpact-root.txt"
}

# Handle first-level directories' files
Get-ChildItem -Path $rootPath -Directory | ForEach-Object {
    $firstLevel = $_.Name
    $firstLevelFiles = Get-ChildItem -Path $_.FullName -File |
        Where-Object { 
            $file = $_
            -not ($excludePatterns.Where({ $file.FullName -match $_ }))
        }
    
    if ($firstLevelFiles) {
        $firstLevelOutput = Join-Path (Get-Location) "policyimpact-$firstLevel.txt"
        foreach ($file in $firstLevelFiles) {
            $relativePath = $file.FullName.Replace("$rootPath\", "")
            @"

// File: $relativePath

$((Get-Content $file.FullName -Raw))

// =================

"@ | Add-Content -Path $firstLevelOutput
        }
        Write-Output "Created policyimpact-$firstLevel.txt"
    }
}
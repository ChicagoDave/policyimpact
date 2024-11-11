# setup-git-repo.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubUsername,
    
    [Parameter(Mandatory=$true)]
    [string]$RepoName
)

# Error handling
$ErrorActionPreference = "Stop"

function Write-Status {
    param([string]$Message)
    Write-Host "➡️ $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

try {
    # Check if git is installed
    if (!(Get-Command git -ErrorAction SilentlyContinue)) {
        throw "Git is not installed. Please install Git first."
    }

    Write-Status "Initializing Git repository..."
    git init
    
    Write-Status "Creating .gitignore file..."
    @"
# dependencies
node_modules
.pnp
.pnp.js

# testing
coverage

# next.js
.next/
out/
build
dist

# misc
.DS_Store
*.pem
.env*
!.env.example

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.idea
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json

# AWS
.aws-sam
cdk.out/
.cdk.staging/
cdk.context.json

# Turborepo
.turbo

# Cache
.eslintcache
.cache
tsconfig.tsbuildinfo
"@ | Out-File -FilePath .gitignore -Encoding utf8

    Write-Status "Creating initial commit..."
    git add .
    git commit -m "Initial commit"

    Write-Status "Adding GitHub remote..."
    $remoteUrl = "https://github.com/$GitHubUsername/$RepoName.git"
    git remote add origin $remoteUrl

    Write-Status "Pulling from remote repository..."
    git pull origin main --allow-unrelated-histories

    Write-Status "Pushing to main branch..."
    git push -u origin main

    Write-Status "Creating and switching to develop branch..."
    git checkout -b develop
    git push -u origin develop

    Write-Success "Git repository setup completed successfully!"
    Write-Success "Main and develop branches are set up and pushed to GitHub."

} catch {
    Write-Error $_.Exception.Message
    Write-Host "`nTroubleshooting steps:" -ForegroundColor Yellow
    Write-Host "1. Ensure Git is installed: Run 'git --version'" -ForegroundColor Yellow
    Write-Host "2. Check GitHub credentials are configured:" -ForegroundColor Yellow
    Write-Host "   - Run 'git config --global user.name ""Your Name""'" -ForegroundColor Yellow
    Write-Host "   - Run 'git config --global user.email ""your.email@example.com""'" -ForegroundColor Yellow
    Write-Host "3. Verify GitHub repository exists and you have access" -ForegroundColor Yellow
    Write-Host "4. If using HTTPS, ensure your GitHub credentials are saved or use SSH instead" -ForegroundColor Yellow
    exit 1
}
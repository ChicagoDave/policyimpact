# Simple Policy Impact Landing Page Deployment Script
# This script deploys your simple landing page files to an S3 bucket

# Configuration
$BucketName = "policyimpact.us"
$Region = "us-east-1"
$AwsProfile = "policyimpact"  # Using the policyimpact profile
$SimpleDirPath = "."          # Current directory (assuming you're in the /simple directory)

# Check if AWS CLI is available
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "Error: AWS CLI is not installed or not in your PATH. Please install it first." -ForegroundColor Red
    exit 1
}

# Check if AWS credentials profile is configured
try {
    $awsIdentity = aws sts get-caller-identity --profile $AwsProfile | ConvertFrom-Json
    Write-Host "Using AWS account: $($awsIdentity.Account) with profile: $AwsProfile" -ForegroundColor Green
}
catch {
    Write-Host "Error: AWS profile '$AwsProfile' not configured or not accessible. Please check your AWS configuration." -ForegroundColor Red
    exit 1
}

# Create or check S3 bucket - using a more reliable method
$bucketExists = $false
try {
    $listBuckets = aws s3api list-buckets --profile $AwsProfile | ConvertFrom-Json
    $bucketExists = $listBuckets.Buckets | Where-Object { $_.Name -eq $BucketName }
}
catch {
    Write-Host "Error checking bucket existence: $_" -ForegroundColor Yellow
}

if ($bucketExists) {
    Write-Host "Bucket $BucketName already exists." -ForegroundColor Yellow
}
else {
    Write-Host "Creating bucket: $BucketName" -ForegroundColor Green
    
    try {
        aws s3api create-bucket --bucket $BucketName --region $Region --profile $AwsProfile
        
        # Configure static website hosting
        aws s3 website "s3://$BucketName" --index-document index.html --error-document index.html --profile $AwsProfile
        
        # Create bucket policy for public access
        $bucketPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BucketName/*"
    }
  ]
}
"@
        
        $tempPolicyPath = Join-Path -Path $env:TEMP -ChildPath "bucket-policy.json"
        $bucketPolicy | Out-File -FilePath $tempPolicyPath -Encoding utf8
        
        # Apply bucket policy
        aws s3api put-bucket-policy --bucket $BucketName --policy file://$tempPolicyPath --profile $AwsProfile
        
        # Clean up temp file
        Remove-Item -Path $tempPolicyPath
    }
    catch {
        Write-Host "Error creating bucket: $_" -ForegroundColor Red
        exit 1
    }
}

# Upload files to S3
Write-Host "Uploading files to S3..." -ForegroundColor Green

# First check if files exist, then upload them
$filesToUpload = @(
    @{Path = "index.html"; ContentType = "text/html"},
    @{Path = "styles.css"; ContentType = "text/css"},
    @{Path = "favicon.svg"; ContentType = "image/svg+xml"}
)

foreach ($file in $filesToUpload) {
    $filePath = Join-Path -Path $SimpleDirPath -ChildPath $file.Path
    
    if (Test-Path -Path $filePath) {
        Write-Host "Uploading $($file.Path) with content type $($file.ContentType)" -ForegroundColor Green
        aws s3 cp $filePath "s3://$BucketName/$($file.Path)" --content-type $file.ContentType --profile $AwsProfile
    }
    else {
        Write-Host "Warning: $($file.Path) not found. Skipping." -ForegroundColor Yellow
    }
}

# Check if favicon.ico exists and upload it
$faviconIcoPath = Join-Path -Path $SimpleDirPath -ChildPath "favicon.ico"
if (Test-Path -Path $faviconIcoPath) {
    aws s3 cp $faviconIcoPath "s3://$BucketName/favicon.ico" --content-type "image/x-icon" --profile $AwsProfile
    Write-Host "Uploaded: favicon.ico" -ForegroundColor Green
}

Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "Website available at: http://$BucketName.s3-website-$Region.amazonaws.com" -ForegroundColor Cyan
Write-Host "Note: For custom domain setup with https, configure CloudFront and Route 53 as needed." -ForegroundColor Yellow
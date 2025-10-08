# Fix git repository sync
$env:GIT_PAGER = 'cat'

Write-Host "Configuring git to disable pager..." -ForegroundColor Cyan
git config --global core.pager ''

Write-Host "`nResetting to remote branch..." -ForegroundColor Cyan
git reset --hard origin/v2.2panel-boundries

Write-Host "`nChecking status..." -ForegroundColor Cyan
git status

Write-Host "`nRecent commits:" -ForegroundColor Cyan
git log --oneline -5

Write-Host "`n✅ Git repository is now synced!" -ForegroundColor Green


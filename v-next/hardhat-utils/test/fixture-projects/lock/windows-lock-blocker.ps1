param(
  [Parameter(Mandatory = $true)]
  [string]$Path
)

$ErrorActionPreference = "Stop"

$fileStream = [System.IO.File]::Open(
  $Path,
  [System.IO.FileMode]::OpenOrCreate,
  [System.IO.FileAccess]::ReadWrite,
  [System.IO.FileShare]::None
)

try {
  [Console]::Out.WriteLine("LOCKED")
  [Console]::Out.Flush()

  while ($true) {
    Start-Sleep -Seconds 1
  }
}
finally {
  if ($null -ne $fileStream) {
    $fileStream.Dispose()
  }
}

$ErrorActionPreference = "Stop"

function Wait-WinRtOperation {
    param(
        [object]$Operation,
        [type]$ResultType
    )

    $method = [System.WindowsRuntimeSystemExtensions].GetMethods() |
        Where-Object { $_.Name -eq "AsTask" -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 } |
        Select-Object -First 1
    $closedMethod = $method.MakeGenericMethod($ResultType)
    $task = $closedMethod.Invoke($null, [object[]]@($Operation))
    return $task.GetAwaiter().GetResult()
}

try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    [void][Windows.Devices.Geolocation.Geolocator, Windows, ContentType = WindowsRuntime]

    $accessOperation = [Windows.Devices.Geolocation.Geolocator]::RequestAccessAsync()
    $access = Wait-WinRtOperation $accessOperation ([Windows.Devices.Geolocation.GeolocationAccessStatus])
    if ($access.ToString() -ne "Allowed") {
        Write-Error "PERMISSION_DENIED:$access"
        exit 10
    }

    $geolocator = [Windows.Devices.Geolocation.Geolocator]::new()
    $positionOperation = $geolocator.GetGeopositionAsync()
    $position = Wait-WinRtOperation $positionOperation ([Windows.Devices.Geolocation.Geoposition])
    $point = $position.Coordinate.Point.Position

    if ($null -eq $point.Latitude -or $null -eq $point.Longitude) {
        Write-Error "UNAVAILABLE:Windows returned no position"
        exit 11
    }

    $city = $null
    if ($null -ne $position.CivicAddress -and -not [string]::IsNullOrWhiteSpace($position.CivicAddress.City)) {
        $city = [string]$position.CivicAddress.City
    }

    [pscustomobject]@{
        latitude = [double]$point.Latitude
        longitude = [double]$point.Longitude
        city = $city
    } | ConvertTo-Json -Compress
} catch {
    $message = $_.Exception.Message
    if ($message -match "access|permission|denied") {
        Write-Error "PERMISSION_DENIED:$message"
        exit 10
    }
    if ($message -match "disabled|turned off") {
        Write-Error "DISABLED:$message"
        exit 12
    }
    Write-Error "UNAVAILABLE:$message"
    exit 11
}
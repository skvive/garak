Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Singapore Model Studio Authentication'
$form.Size = New-Object System.Drawing.Size(560, 285)
$form.StartPosition = 'CenterScreen'
$form.TopMost = $true
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false

$label = New-Object System.Windows.Forms.Label
$label.Location = New-Object System.Drawing.Point(22, 20)
$label.Size = New-Object System.Drawing.Size(500, 42)
$label.Text = "Enter the Singapore workspace API key and API Host shown by Model Studio.`r`nThe key is not saved in this project and is passed only to the bl credential store."
$form.Controls.Add($label)

$input = New-Object System.Windows.Forms.TextBox
$input.Location = New-Object System.Drawing.Point(25, 72)
$input.Size = New-Object System.Drawing.Size(455, 26)
$input.UseSystemPasswordChar = $true
$form.Controls.Add($input)

$hostLabel = New-Object System.Windows.Forms.Label
$hostLabel.Location = New-Object System.Drawing.Point(22, 111)
$hostLabel.Size = New-Object System.Drawing.Size(120, 20)
$hostLabel.Text = 'API Host'
$form.Controls.Add($hostLabel)

$hostInput = New-Object System.Windows.Forms.TextBox
$hostInput.Location = New-Object System.Drawing.Point(25, 134)
$hostInput.Size = New-Object System.Drawing.Size(495, 26)
$hostInput.Text = 'https://YOUR_WORKSPACE_ID.ap-southeast-1.maas.aliyuncs.com'
$form.Controls.Add($hostInput)

$ok = New-Object System.Windows.Forms.Button
$ok.Text = 'Authenticate'
$ok.Location = New-Object System.Drawing.Point(360, 190)
$ok.DialogResult = [System.Windows.Forms.DialogResult]::OK
$form.AcceptButton = $ok
$form.Controls.Add($ok)

$cancel = New-Object System.Windows.Forms.Button
$cancel.Text = 'Cancel'
$cancel.Location = New-Object System.Drawing.Point(445, 190)
$cancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
$form.CancelButton = $cancel
$form.Controls.Add($cancel)

$result = $form.ShowDialog()
if ($result -ne [System.Windows.Forms.DialogResult]::OK) { exit 2 }

$plainKey = $input.Text.Trim()
$apiHost = $hostInput.Text.Trim().TrimEnd('/')
$input.Clear()
$hostInput.Clear()
$form.Dispose()
if (-not ($plainKey.StartsWith('sk-ws-') -or $plainKey.StartsWith('sk-'))) {
  [System.Windows.Forms.MessageBox]::Show('A workspace API key must start with sk-ws- or sk-.', 'Invalid key format', 'OK', 'Error') | Out-Null
  exit 3
}
if (-not ($apiHost -match '^https://[^/]+\.ap-southeast-1\.maas\.aliyuncs\.com$')) {
  [System.Windows.Forms.MessageBox]::Show('Paste the Singapore API Host exactly as shown by Model Studio.', 'Invalid API Host', 'OK', 'Error') | Out-Null
  exit 4
}

try {
  & bl auth login --config singapore-workspace --api-key $plainKey --base-url $apiHost
  if ($LASTEXITCODE -eq 0) {
    [System.Windows.Forms.MessageBox]::Show('Singapore workspace authentication completed.', 'Authentication complete', 'OK', 'Information') | Out-Null
  } else {
    [System.Windows.Forms.MessageBox]::Show("Authentication failed. Exit code: $LASTEXITCODE", 'Authentication failed', 'OK', 'Error') | Out-Null
  }
  exit $LASTEXITCODE
} finally {
  $plainKey = $null
  $apiHost = $null
}

// ========================
// Energy Monitor Backup JS
// ========================

// Fetch and Display Backups
export function fetchBackups() {
    const backupContent = document.getElementById('config-file-selection');
    backupContent.innerHTML = '';
    fetch('/list_backups')
        .then(response => response.json())
        .then(data => {
            const files = data.backups;
            if (!files || files.length === 0) {
                backupContent.innerHTML = '<p>No backup files found.</p>';
                return;
            }
            files.forEach(filename => {
                const displayName = filename.replace(/\.json$/, '');
                const row = document.createElement('div');
                row.className = 'settings-entry';
                row.id = `backup-entry-${displayName}`;
                const nameDiv = document.createElement('div');
                nameDiv.className = 'settings-label';
                nameDiv.innerText = displayName;
                const actionDiv = document.createElement('div');
                actionDiv.className = 'settings-action';
                const deleteIcon = document.createElement('i');
                deleteIcon.className = 'fa-solid fa-trash';
                deleteIcon.title = 'Delete Config File';
                deleteIcon.setAttribute('data-filename', filename);
                deleteIcon.addEventListener('click', () => {
                    deleteBackupConfirmation(filename);
                });
                const restoreIcon = document.createElement('i');
                restoreIcon.className = 'fa-solid fa-file-import';
                restoreIcon.title = 'Restore Config File';
                restoreIcon.setAttribute('data-filename', filename);
                restoreIcon.addEventListener('click', () => {
                    restoreBackupConfirmation(filename);
                });
                actionDiv.appendChild(deleteIcon);
                actionDiv.appendChild(restoreIcon);
                row.appendChild(nameDiv);
                row.appendChild(actionDiv);
                
                backupContent.appendChild(row);
            });
        });
}

// Delete Backup Confirmation
export function deleteBackupConfirmation(filename) {
    document.getElementById('config-file-selection').classList.add('hidden');
    document.getElementById('delete-config-confirmation').classList.remove('hidden');
    document.getElementById('config-action-btns').classList.remove('hidden');
    document.getElementById('delete-config-cancel').classList.remove('hidden');
    document.getElementById('delete-config-confirm').classList.remove('hidden');
    const confirmDeleteHtml = document.getElementById('delete-file-name');
    confirmDeleteHtml.innerHTML = `${filename}`;

    // Confirm Delete Handler
    document.getElementById('delete-config-confirm').addEventListener('click', () => {
        document.getElementById('delete-config-confirmation').classList.add('hidden');
        document.getElementById('config-action-btns').classList.remove('hidden');
        document.getElementById('delete-config-cancel').classList.add('hidden');
        document.getElementById('delete-config-confirm').classList.add('hidden');
        document.getElementById('config-action-message').classList.remove('hidden');
        document.getElementById('config-action-complete').classList.remove('hidden');

        deleteBackup(filename);
    });
}

// Restore Backup Confirmation
export function restoreBackupConfirmation(filename) {
    document.getElementById('restore-config-confirmation').classList.remove('hidden');
    document.getElementById('config-action-btns').classList.remove('hidden');
    document.getElementById('restore-config-cancel').classList.remove('hidden');
    document.getElementById('restore-config-confirm').classList.remove('hidden');
    const confirmRestoreHtml = document.getElementById('restore-file-name');
    confirmRestoreHtml.innerHTML = `${filename}`;

    // Confirm Restore Handler
    document.getElementById('restore-config-confirm').addEventListener('click', () => {
        document.getElementById('delete-config-confirmation').classList.add('hidden');
        document.getElementById('config-action-btns').classList.remove('hidden');
        document.getElementById('restore-config-cancel').classList.add('hidden');
        document.getElementById('restore-config-confirm').classList.add('hidden');
        document.getElementById('config-action-message').classList.remove('hidden');
        document.getElementById('config-action-complete').classList.remove('hidden');
        restoreBackup(filename);
    });
}

// Create Backup
export function createBackup() {
    const programConfig = document.getElementById('program-config').checked ? 1 : 0;
    const sensorConfig = document.getElementById('sensor-config').checked ? 1 : 0;
    const backupMsg = document.getElementById('backup-result');
    fetch('/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programConfig, sensorConfig })
    })
    .then(response => response.json())
    .then(data => {
    	  const backupMsg = document.getElementById('backup-result');
        if (data.success) {
            backupMsg.innerHTML = 'Backup created successfully!';
        } else {
            backupMsg.innerHTML = 'Backup failed: ' + (data.error || 'Unknown error');
        }
    })
    .catch(error => {
        backupMsg.innerHTML = 'Backup failed: Network error';
        console.error('Backup error:', error);
    });
}

// Delete Backup
export function deleteBackup(filename) {
    fetch('/delete_backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
    })
        .then(res => res.json())
        .then(() => {
            document.getElementById('config-action-result').innerHTML = 'Backup file deleted successful';
        })
        .catch(error => {
            document.getElementById('config-action-result').innerText = 'Failed to delete Backup.';
            console.error('Error restoring Backup:', error);
        });
}

// Restore Backup
export async function restoreBackup(filename) {
    document.getElementById('restore-config-confirmation').classList.add('hidden');
    document.getElementById('config-action-message').classList.remove('hidden');
    const restoreResult = document.getElementById('config-action-result');
    restoreResult.innerHTML = 'Restoring backup...';
    const restoreConfig = confirm('Restore config.json?');
    const restoreSensors = confirm('Restore sensors.json?');
    const res = await fetch('restore_backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, restore_config: restoreConfig, restore_sensors: restoreSensors })
    });
    const result = await res.json();
    restoreResult.innerHTML = '';
    if (result.success) {
        restoreResult.innerHTML = 'Restore successful. Please reload or restart the app.';
    } else {
        restoreResult.innerHTML = 'Restore failed: ' + result.error;
        
    }
}




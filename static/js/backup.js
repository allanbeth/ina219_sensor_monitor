// ========================
// Energy Monitor Backup JS
// ========================

export function createBackup() {
    const programConfig = document.getElementById('program-config').checked ? 1 : 0;
    const sensorConfig = document.getElementById('sensor-config').checked ? 1 : 0;
    const backupMsg = document.getElementById('backup-config-text');
    fetch('/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programConfig, sensorConfig })
    });
    document.getElementById('backup-config-data').classList.add('hidden');
    document.getElementById('backup-config-btns').classList.add('hidden');
    backupMsg.innerHTML = '<p>Backup Successful</p>';
}

export function fetchBackups() {
    const backupContainer = document.getElementById('restore-config-entries');
    backupContainer.innerHTML = '';
    fetch('/list_backups')
        .then(response => response.json())
        .then(data => {
            const files = data.backups;
            if (!files || files.length === 0) {
                backupContainer.innerHTML = '<p>No backup files found.</p>';
                return;
            }
            files.forEach(filename => {
                const displayName = filename.replace(/\.json$/, '');
                const row = document.createElement('div');
                row.className = 'restore-config-entry';
                const nameDiv = document.createElement('div');
                nameDiv.className = 'restore-config-file-name';
                nameDiv.innerText = displayName;
                const deleteIcon = document.createElement('i');
                deleteIcon.className = 'fas fa-trash';
                deleteIcon.title = 'Delete';
                deleteIcon.setAttribute('data-filename', filename);
                deleteIcon.addEventListener('click', () => {
                    confirmDeleteBackup(filename);
                });
                const restoreIcon = document.createElement('i');
                restoreIcon.className = 'fas fa-file-import';
                restoreIcon.title = 'Restore';
                restoreIcon.setAttribute('data-filename', filename);
                restoreIcon.addEventListener('click', () => {
                    confirmRestoreBackup(filename);
                });
                row.appendChild(nameDiv);
                row.appendChild(deleteIcon);
                row.appendChild(restoreIcon);
                backupContainer.appendChild(row);
            });
        });
}

export function confirmRestoreBackup(filename) {
    const confirmText = document.getElementById('restore-config-text');
    confirmText.innerHTML = `<div class="restore-config-text" id="restore-config-text"><p>Are you sure you want to restore "${filename}"?</p></div>`;
    const confirmDiv = document.getElementById('restore-config-entries');
    confirmDiv.innerHTML = `<div class="confirm-btns"><i class="fas fa-xmark" id="cancel-restore" title="Cancel"></i><i class="fas fa-check" id="confirm-restore" title="Delete"></i></div>`;
    document.getElementById('cancel-restore').addEventListener('click', () => {
        fetchBackups();
    });
    document.getElementById('confirm-restore').addEventListener('click', () => {
        restoreBackup(filename);
    });
}

export async function restoreBackup(filename) {
    const restoreConfig = confirm('Restore config.json?');
    const restoreSensors = confirm('Restore sensors.json?');
    const res = await fetch('restore_backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, restore_config: restoreConfig, restore_sensors: restoreSensors })
    });
    const result = await res.json();
    if (result.success) {
        alert('Restore successful. Please reload or restart the app.');
    } else {
        alert('Restore failed: ' + result.error);
    }
}

export function confirmDeleteBackup(filename) {
    const confirmText = document.getElementById('restore-config-text');
    confirmText.innerHTML = `<div class="restore-config-text" id="restore-config-text"><p>Are you sure you want to delete "${filename}"?</p></div>`;
    const confirmDiv = document.getElementById('restore-config-entries');
    confirmDiv.innerHTML = `<div class="confirm-btns"><i class="fas fa-xmark" id="cancel-delete" title="Cancel"></i><i class="fas fa-check" id="confirm-delete" title="Delete"></i></div>`;
    document.getElementById('cancel-delete').addEventListener('click', () => {
        fetchBackups();
    });
    document.getElementById('confirm-delete').addEventListener('click', () => {
        deleteBackup(filename);
    });
}

export function deleteBackup(filename) {
    fetch('/delete_backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
    })
        .then(res => res.json())
        .then(() => {
            document.getElementById('restore-config-entries').innerHTML = 'Backup file deleted successful';
        })
        .catch(error => {
            document.getElementById('restore-config-data').innerText = 'Failed to delete Backup.';
            console.error('Error restoring Backup:', error);
        });
}

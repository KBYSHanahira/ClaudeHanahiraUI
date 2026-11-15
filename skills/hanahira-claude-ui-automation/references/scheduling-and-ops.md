# Scheduling and operations

A look-up for putting a job on a schedule and keeping it honest: cron, systemd timers, Windows Task Scheduler, monitoring, log rotation, and a backup job with verification.

## cron with locking and logging

```cron
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
MAILTO=""
# m h dom mon dow  command
15 2 * * *  flock -n /run/lock/backup.lock /opt/jobs/backup.sh >> /var/log/backup.log 2>&1
*/10 * * * *  flock -n /run/lock/sync.lock /opt/jobs/sync.sh --quiet >> /var/log/sync.log 2>&1
0 3 * * 0  /opt/jobs/report.sh "$(date +\%Y\%m\%d)" >> /var/log/report.log 2>&1
```

- Edit with `crontab -e`; list with `crontab -l`. System jobs in `/etc/cron.d/` take a user field after the schedule.
- `flock -n` exits at once if the previous run still holds the lock; use `-w 60` to wait instead.
- Check that cron ran it: `grep CRON /var/log/syslog` or `journalctl -u cron` on Debian and Ubuntu; `journalctl -u crond` (or `/var/log/cron`) on RHEL and Fedora.

## systemd service and timer

`/etc/systemd/system/backup.service`:

```ini
[Service]
Type=oneshot
User=backup
ExecStart=/opt/jobs/backup.sh
```

`/etc/systemd/system/backup.timer`:

```ini
[Timer]
OnCalendar=*-*-* 02:15:00
Persistent=true

[Install]
WantedBy=timers.target
```

- Enable: `systemctl daemon-reload && systemctl enable --now backup.timer`.
- Check: `systemctl list-timers`, `systemctl status backup.service`, `journalctl -u backup.service --since today`.
- Validate a calendar expression: `systemd-analyze calendar '*-*-* 02:15:00'`. Run once by hand: `systemctl start backup.service`.

## Windows scheduled task

```powershell
$action  = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument '-NoProfile -ExecutionPolicy Bypass -File C:\Jobs\backup.ps1' -WorkingDirectory 'C:\Jobs'
$trigger = New-ScheduledTaskTrigger -Daily -At 2:15am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName 'NightlyBackup' -Action $action -Trigger $trigger `
  -Settings $settings -User 'SYSTEM' -RunLevel Highest
```

- Run once: `Start-ScheduledTask -TaskName NightlyBackup`. Check: `Get-ScheduledTaskInfo -TaskName NightlyBackup` (`LastTaskResult` 0 is success).
- `-MultipleInstances IgnoreNew` is the Windows form of a lock. `-StartWhenAvailable` catches missed runs.

## Monitoring

- **Heartbeat**: ping a healthcheck URL at the end of a good run, and its start and fail endpoints around it: `curl -fsS -m 10 --retry 3 "$HC_URL/start"` ... `curl -fsS -m 10 --retry 3 "$HC_URL"` or `"$HC_URL/fail"`. The service alerts when the ping does not arrive on time.
- **Exit status**: in systemd, `OnFailure=notify@%n.service` in `[Unit]` runs an alert unit on failure; it needs a `notify@.service` template unit of your own that sends the alert (it receives the failed unit's name as `%i`). In cron, wrap the job: `/opt/jobs/backup.sh || /opt/jobs/alert.sh "backup failed: $?"`.

## Log rotation

`/etc/logrotate.d/myjobs`:

```
/var/log/backup.log /var/log/sync.log {
    weekly
    rotate 8
    compress
    missingok
    copytruncate
}
```

- Test with `logrotate -d /etc/logrotate.d/myjobs` (dry run), then `logrotate -f` to force once.

## Backup job pattern

1. Lock, then dump or copy to a temp name: `pg_dump -Fc mydb > "$dest/mydb.$ts.dump.tmp"`, or `tar -czf "$dest/files.$ts.tar.gz.tmp" -C /srv data`.
2. Verify the archive reads back: `pg_restore --list` or `tar -tzf` on it. Then `mv` the temp name to the final name.
3. Record a checksum: `sha256sum "$file" > "$file.sha256"`; copy off-site (`rsync -a` or `rclone copy`) and verify there with `sha256sum -c`.
4. Prune by age, printing first: `find "$dest" \( -name '*.dump' -o -name '*.tar.gz' -o -name '*.sha256' \) -mtime +14 -print`, then the same with `-delete` once the list is right.
5. Ping the heartbeat only after all of the above succeeded.
6. **Restore test** on a schedule (monthly): restore the latest backup into a scratch database or directory, run a sanity query or file count, and alert if it differs from expectation.

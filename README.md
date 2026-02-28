# Service Stats UI

Small web UI to view system info (memory, uptime, load) and list/control systemd services. Uses PHP for the API and vanilla JS for the frontend.

- **System**: memory, swap, uptime, load average (refreshes every 60s).
- **Services**: searchable list with Start / Stop / Restart.

## How to deploy

Requires PHP, a web server (Apache below), and three helper scripts run via `sudo` by the web server user.

**Prerequisites:** Server with PHP and Apache; DNS for your hostname pointing to the server.

### 1. Upload app and scripts

```bash
# Create remote docroot and dirs (adjust USER and HOST)
ssh USER@HOST "sudo mkdir -p /var/www/YOUR_DOMAIN/api /var/www/YOUR_DOMAIN/assets"

# Upload web files
scp index.html USER@HOST:/tmp/
scp assets/style.css assets/app.js USER@HOST:/tmp/
scp api/*.php USER@HOST:/tmp/api/

ssh USER@HOST "sudo mv /tmp/index.html /var/www/YOUR_DOMAIN/ && \
  sudo mv /tmp/style.css /var/www/YOUR_DOMAIN/assets/ && \
  sudo mv /tmp/app.js /var/www/YOUR_DOMAIN/assets/ && \
  sudo mv /tmp/api/*.php /var/www/YOUR_DOMAIN/api/ && \
  sudo chown -R www-data:www-data /var/www/YOUR_DOMAIN"

# Upload and install helper scripts
scp scripts/stats-list-services.sh scripts/stats-service-control.sh scripts/stats-system-info.sh USER@HOST:/tmp/
ssh USER@HOST "sudo mv /tmp/stats-*.sh /usr/local/bin/ && sudo chmod 755 /usr/local/bin/stats-*.sh"
```

Replace `USER`, `HOST`, and `YOUR_DOMAIN` with your SSH user, server hostname, and document root path.

### 2. Sudoers (allow www-data to run scripts)

Create `/etc/sudoers.d/stats` (no spaces around `=`):

```
www-data ALL=(ALL) NOPASSWD: /usr/local/bin/stats-list-services.sh
www-data ALL=(ALL) NOPASSWD: /usr/local/bin/stats-service-control.sh
www-data ALL=(ALL) NOPASSWD: /usr/local/bin/stats-system-info.sh
```

Then: `sudo chmod 440 /etc/sudoers.d/stats` and `sudo visudo -c`.

### 3. Apache: password protection and vhost

Create htpasswd and vhost:

```bash
sudo htpasswd -c /etc/apache2/.htpasswd-stats statsuser
sudo chown root:www-data /etc/apache2/.htpasswd-stats
sudo chmod 640 /etc/apache2/.htpasswd-stats
```

Example vhost (e.g. `/etc/apache2/sites-available/your-stats.conf`):

```apache
<VirtualHost *:80>
    ServerName your-domain.example.com
    DocumentRoot /var/www/YOUR_DOMAIN
    <Directory /var/www/YOUR_DOMAIN>
        Options -Indexes +FollowSymLinks
        AllowOverride None
        AuthType Basic
        AuthName "Server stats"
        AuthUserFile /etc/apache2/.htpasswd-stats
        Require valid-user
    </Directory>
    ErrorLog ${APACHE_LOG_DIR}/your-stats.error.log
    CustomLog ${APACHE_LOG_DIR}/your-stats.access.log combined
</VirtualHost>
```

Enable and reload: `sudo a2ensite your-stats`, `sudo a2enmod auth_basic authn_file authz_user`, `sudo systemctl reload apache2`.

### 4. HTTPS with Certbot

`sudo certbot --apache -d your-domain.example.com` (then follow prompts).

### 5. Scripts

- `stats-list-services.sh` — list systemd services (JSON).
- `stats-service-control.sh` — start/stop/restart a service.
- `stats-system-info.sh` — memory, uptime, load (JSON).

They run as root via `sudo`; restrict them in sudoers as above.

## License

[MIT](LICENSE) — use, modify, and redistribute as you like; keep the license and give credit.

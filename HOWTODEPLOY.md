# How to deploy Server Stats UI

This app shows system info and service list/control. It needs PHP, Apache (or nginx), and three helper scripts run via `sudo` by the web server user.

## Prerequisites

- A server with PHP and a web server (Apache used here).
- DNS for your chosen hostname pointing to the server.

## 1. Upload app and scripts

Create the document root and upload files:

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

## 2. Sudoers (allow www-data to run scripts)

The PHP API runs the stats scripts with `sudo`. Create a sudoers fragment on the server:

- File: `/etc/sudoers.d/stats` (or a name of your choice)
- Content (no spaces around `=`):

```
www-data ALL=(ALL) NOPASSWD: /usr/local/bin/stats-list-services.sh
www-data ALL=(ALL) NOPASSWD: /usr/local/bin/stats-service-control.sh
www-data ALL=(ALL) NOPASSWD: /usr/local/bin/stats-system-info.sh
```

Install and check:

```bash
sudo chmod 440 /etc/sudoers.d/stats
sudo visudo -c
```

## 3. Apache: password protection and vhost

Create an htpasswd file (replace `statsuser` and run to set password):

```bash
sudo htpasswd -c /etc/apache2/.htpasswd-stats statsuser
sudo chown root:www-data /etc/apache2/.htpasswd-stats
sudo chmod 640 /etc/apache2/.htpasswd-stats
```

Example vhost (save as e.g. `/etc/apache2/sites-available/your-stats.conf`):

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

Enable site and modules, then reload:

```bash
sudo a2ensite your-stats
sudo a2enmod auth_basic authn_file authz_user
sudo systemctl reload apache2
```

## 4. HTTPS with Certbot

On the server:

```bash
sudo certbot --apache -d your-domain.example.com
```

Follow prompts. Certbot will add HTTPS and redirect HTTP to HTTPS.

## 5. Test

Open `https://your-domain.example.com`, log in with the htpasswd user, and check System and Services (list and Start/Stop/Restart).

## Scripts

- `stats-list-services.sh` — lists systemd services (JSON).
- `stats-service-control.sh` — start/stop/restart a service (action + unit name).
- `stats-system-info.sh` — memory, uptime, load (JSON).

They are intended to be run as root via `sudo` by the web server user; restrict them in sudoers as shown above.

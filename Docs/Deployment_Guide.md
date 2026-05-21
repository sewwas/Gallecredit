# Microfinance Management System (MMS) - Deployment Guide

This guide outlines the steps to deploy the MMS application to a production server (e.g., AWS, DigitalOcean, VPS).

## Prerequisites
- A Linux VPS (Ubuntu 22.04 recommended)
- Node.js (v18+)
- PostgreSQL (v14+)
- Nginx
- PM2 (Process Manager for Node.js)

---

## 1. Database Setup

1. Log into your VPS via SSH.
2. Switch to the PostgreSQL user and open the prompt:
   ```bash
   sudo -i -u postgres
   psql
   ```
3. Create the database and user:
   ```sql
   CREATE DATABASE mms_db;
   CREATE USER mms_user WITH ENCRYPTED PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE mms_db TO mms_user;
   \q
   ```
4. Run the schema migrations. You can copy the `backend/db/schema.sql` file to the server and execute it:
   ```bash
   psql -d mms_db -U mms_user -f schema.sql
   ```

---

## 2. Backend Deployment

1. Clone or copy your project repository to the server (e.g., `/var/www/mms`).
2. Navigate to the backend directory:
   ```bash
   cd /var/www/mms/backend
   npm install --production
   ```
3. Create a `.env` file in the backend directory:
   ```env
   PORT=5000
   DB_USER=mms_user
   DB_PASSWORD=your_secure_password
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=mms_db
   JWT_SECRET=generate_a_very_long_random_string_here
   ```
4. Start the backend using PM2 to ensure it runs in the background and restarts on crash:
   ```bash
   npm install -g pm2
   pm2 start index.js --name "mms-backend"
   pm2 save
   pm2 startup
   ```

---

## 3. Frontend Deployment

1. Navigate to the frontend directory:
   ```bash
   cd /var/www/mms/frontend
   npm install
   ```
2. Build the production assets:
   ```bash
   npm run build
   ```
   *This will generate a `dist` folder containing the compiled static files.*

---

## 4. Nginx Configuration (Reverse Proxy)

1. Install Nginx:
   ```bash
   sudo apt update
   sudo apt install nginx
   ```
2. Create a new Nginx configuration file:
   ```bash
   sudo nano /etc/nginx/sites-available/mms
   ```
3. Add the following configuration (replace `your_domain.com`):
   ```nginx
   server {
       listen 80;
       server_name your_domain.com;

       # Serve React Frontend
       location / {
           root /var/www/mms/frontend/dist;
           index index.html;
           try_files $uri $uri/ /index.html;
       }

       # Proxy API requests to Node.js Backend
       location /api/ {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
4. Enable the site and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/mms /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## 5. SSL / HTTPS (Important for Security)

Use Certbot to secure your application with a free Let's Encrypt SSL certificate:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your_domain.com
```

Your system is now live and secure!

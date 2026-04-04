#!/bin/bash

# Database initialization script for MySQL container
set -e

echo "🗄️ Initializing MySQL database..."

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL to be ready..."
while ! mysqladmin ping -h localhost -u root -p"$MYSQL_ROOT_PASSWORD" --silent; do
    echo "MySQL not ready, waiting..."
    sleep 2
done

echo "✅ MySQL is ready!"

# Create database if not exists
mysql -h localhost -u root -p"$MYSQL_ROOT_PASSWORD" -e "
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
" || echo "Database already exists or created"

# Create user if not exists
mysql -h localhost -u root -p"$MYSQL_ROOT_PASSWORD" -e "
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;
" || echo "User already exists or created"

echo "✅ Database initialization completed!"

# Show created databases and users
echo "📋 Databases:"
mysql -h localhost -u root -p"$MYSQL_ROOT_PASSWORD" -e "SHOW DATABASES;"

echo "👥 Users:"
mysql -h localhost -u root -p"$MYSQL_ROOT_PASSWORD" -e "SELECT User, Host FROM mysql.user WHERE User='${MYSQL_USER}';"

echo "🎉 MySQL initialization finished successfully!"

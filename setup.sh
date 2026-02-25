#!/bin/bash

cd "$(dirname "$0")"

echo "=== Serve Database Setup ==="
echo ""

# Check if .env already exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists!"
    read -p "Overwrite existing .env? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing .env file."
        echo "If you need to recreate the database, follow troubleshooting steps."
        exit 0
    fi
fi

echo "Creating databases and generating secure passwords..."
echo ""

# Generate passwords automatically (no Django dependency)
SERVE_PASSWORD=$(openssl rand -base64 32)
DJANGO_SECRET=$(openssl rand -base64 50)


# Run setup SQL
mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS serve CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS test_serve CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'serve'@'localhost' IDENTIFIED BY '$SERVE_PASSWORD';
GRANT ALL PRIVILEGES ON serve.* TO 'serve'@'localhost';
GRANT ALL PRIVILEGES ON test_serve.* TO 'serve'@'localhost';
FLUSH PRIVILEGES;
EOF

if [ $? -ne 0 ]; then
    echo "Database setup failed!"
    echo "Make sure MySQL is running and you can connect as root without a password."
    echo "Try: mysql -u root"
    exit 1
fi

# Update .env file
cat > .env << EOF
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=serve
DB_USER=serve
DB_PASSWORD='$SERVE_PASSWORD'

DJANGO_SECRET_KEY='$DJANGO_SECRET'
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
EOF

echo ""
echo "✓ Database setup complete!"
echo "✓ .env file created"
echo ""
echo "Next steps:"
echo "  cd backend"
echo "  python manage.py migrate"
echo "  python manage.py createsuperuser"
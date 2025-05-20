### Para rodar em modo de desenvolvimento
Instale as dependências e rode o backend com "npm start" e o front com "npm run dev"

### Instalação em Produção no ubuntu server
apt update

### Instalar dependências básicas
apt install -y git curl wget build-essential

### Adicionar repositório Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

### Instalar Node.js
apt install -y nodejs

### Verificar a instalação
node -v  # Deve mostrar v18.x.x
npm -v   # Deve mostrar a versão do npm

### Instalar Nginx
apt install -y nginx

### Habilitar e iniciar o Nginx
systemctl enable nginx
systemctl start nginx

### Criar diretório para a aplicação
cd /var/www/
git clone https://github.com/tassyosilva/intimazap.git
chown -R $USER:$USER /var/www/intimazap

### Entrar no diretório do backend
cd /var/www/intimazap/backend

### Instalar dependências
npm install

### Criar arquivo .env
cat > .env << EOF
DB_HOST=localhost
DB_USER=intimazap
DB_PASSWORD=senha
DB_NAME=db_intimazap-dev
DB_PORT=5432
EOF

### Criar serviço systemd para o backend
nano /etc/systemd/system/intimazap-backend.service

Conteúdo do arquivo intimazap-backend.service:
[Unit]
Description=IntimaZap Backend Service
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/intimazap/backend
ExecStart=/usr/bin/node index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target

### Configurar permissões
chown -R www-data:www-data /var/www/intimazap/backend
chmod -R 755 /var/www/intimazap/backend
mkdir -p /var/www/intimazap/backend/auth_info_baileys
chmod -R 777 /var/www/intimazap/backend/auth_info_baileys

### Iniciar o serviço
systemctl daemon-reload
systemctl enable intimazap-backend
systemctl start intimazap-backend

### Verificar status do serviço
sudo systemctl status intimazap-backend

### Entrar no diretório do frontend
cd /var/www/intimazap/frontend

### Instalar dependências
npm install

### Acesse
cd /var/www/intimazap/frontend

### Construir o frontend para produção
npm run build

### Configurar o Nginx para servir o frontend e fazer proxy para o backend
nano /etc/nginx/sites-available/intimazap

### Ativar o site e reiniciar o Nginx
sudo ln -s /etc/nginx/sites-available/intimazap /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remover o site padrão
systemctl restart nginx

### Configurar permissões
chown -R www-data:www-data /var/www/intimazap/frontend/dist
chmod -R 755 /var/www/intimazap/frontend/dist
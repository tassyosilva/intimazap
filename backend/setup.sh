#!/bin/bash

# Instalar dependências do projeto
npm install

# Verificar se o módulo crypto-browserify está instalado
if ! npm list | grep -q "crypto-hkdf"; then
  echo "Instalando crypto-hkdf..."
  npm install crypto-hkdf
fi

echo "Configuração concluída!"
echo "Para iniciar o servidor, execute: npm start"
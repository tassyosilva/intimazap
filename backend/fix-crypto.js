// Este arquivo corrige erros relacionados a bibliotecas de criptografia no Baileys
const crypto = require('crypto');
const hkdf = require('futoin-hkdf');

// Defina global.crypto para o ambiente Node.js
if (!global.crypto) {
    global.crypto = crypto.webcrypto || {};
}

// Certifique-se de que todas as funções necessárias estejam definidas
if (typeof global.crypto.getRandomValues !== 'function') {
    global.crypto.getRandomValues = function getRandomValues(array) {
        return crypto.randomFillSync(array);
    };
}

// Polyfill para crypto.subtle
global.crypto.subtle = global.crypto.subtle || {};

// Adicione as funções necessárias para HKDF
if (!global.crypto.subtle.importKey) {
    global.crypto.subtle.importKey = function importKey(format, keyData, algorithm, extractable, keyUsages) {
        return Promise.resolve(keyData);
    };
}

if (!global.crypto.subtle.deriveBits) {
    global.crypto.subtle.deriveBits = function deriveBits(algorithm, baseKey, length) {
        return new Promise((resolve, reject) => {
            try {
                const salt = algorithm.salt || Buffer.alloc(0);
                const info = algorithm.info || Buffer.alloc(0);

                // Use a biblioteca futoin-hkdf para implementar HKDF
                const result = hkdf(baseKey, length / 8, {
                    salt: salt,
                    info: info,
                    hash: 'sha256'
                });

                resolve(result);
            } catch (error) {
                reject(error);
            }
        });
    };
}

// Adicionar função HKDF diretamente no objeto global para Baileys
global.hkdf = function (key, salt, info, length) {
    return hkdf(key, length, {
        salt: salt,
        info: info,
        hash: 'sha256'
    });
};
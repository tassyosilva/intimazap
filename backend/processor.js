const XLSX = require('xlsx');
const { pool } = require('./db');
const fs = require('fs-extra');
const path = require('path');

// Função para gerar a mensagem personalizada
async function gerarMensagem(nome, data, hora) {
    try {
        // Buscar o template de mensagem no banco de dados
        const result = await pool.query('SELECT valor FROM config_sistema WHERE chave = $1', ['template_mensagem']);

        let template;
        if (result.rows.length > 0) {
            template = result.rows[0].valor;
        } else {
            // Template padrão caso não exista no banco
            template = `Olá, {nome}!
O(A) Senhor(a) está recebendo uma intimação para comparecer à sede da Delegacia mais próxima de sua residência, até a data de {data}, às {hora}h, munido(a) de documento de identificação e deste MANDADO DE INTIMAÇÃO juntamente do aparelho celular em que foi recebida a presente mensagem, para prestar esclarecimento sobre fato em apuração.
{nome}, ao se apresentar, o(a) Senhor(a) deverá procurar o Delegado de Polícia e apresentar este MANDADO DE INTIMAÇÃO.
Em caso de ausência, favor justificar junto ao cartório da Delegacia mais próxima, pois a ausência injustificada poderá caracterizar crime de desobediência, previsto no artigo 330 do Código Penal.
Em caso de dúvidas, entre em contato através do número (95)99168-7209
A confirmação da titularidade desta conta de WhatsApp pela Polícia Civil do Estado de Roraima pode ser conferida acessando o site da PCRR no link abaixo: 
https://policiacivil.rr.gov.br/intimacao-eletronica-pcrr/`;
        }

        // Substituir as variáveis no template
        return template
            .replace(/{nome}/g, nome)
            .replace(/{data}/g, data)
            .replace(/{hora}/g, hora);
    } catch (error) {
        console.error('Erro ao gerar mensagem:', error);
        throw error;
    }
}

// Função para processar o arquivo XLSX
async function processarPlanilha(filePath, dataIntimacao, horaIntimacao) {
    try {
        console.log(`Processando planilha: ${filePath}`);
        console.log(`Data intimação: ${dataIntimacao}, Hora: ${horaIntimacao}`);

        // Ler o arquivo
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        console.log(`Encontrados ${data.length} registros na planilha`);

        // Debug: imprimir os dados de cada linha
        data.forEach((row, index) => {
            console.log(`DEBUG Planilha [${index}]: BO=${row['V_Nr Registro BO']}, Telefone=${row['R_Número A']}, Nome=${row['Nome do Receptador']}`);
        });

        const resultados = {
            total: data.length,
            processados: 0,
            erros: 0,
            detalhes: []
        };

        // Processamento dos registros
        for (const row of data) {
            try {
                const boRegistro = row['V_Nr Registro BO'] || '';
                const telefone = row['R_Número A'] || '';
                const nome = row['Nome do Receptador'] || '';

                console.log(`Processando registro: Nome=${nome}, Telefone=${telefone}`);

                // Pular registros sem telefone
                if (!telefone || telefone === 'Sem Informação') {
                    console.log(`Pulando registro sem telefone: ${boRegistro}`);
                    resultados.detalhes.push({
                        registro: boRegistro,
                        status: 'pulado',
                        motivo: 'Telefone não informado'
                    });
                    continue;
                }

                // Gerar mensagem personalizada
                const mensagem = await gerarMensagem(nome, dataIntimacao, horaIntimacao);
                console.log(`Mensagem gerada para ${nome}, primeiros 50 caracteres: ${mensagem.substring(0, 50)}...`);

                // Inserir no banco de dados
                const result = await pool.query(
                    `INSERT INTO intimacoes 
                    (bo_registro, nome, telefone, data_intimacao, hora_intimacao, mensagem, status) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7) 
                    RETURNING id`,
                    [boRegistro, nome, telefone, dataIntimacao, horaIntimacao, mensagem, 'pendente']
                );

                console.log(`Registro inserido no banco de dados com ID=${result.rows[0].id}`);

                resultados.processados++;
                resultados.detalhes.push({
                    id: result.rows[0].id,
                    registro: boRegistro,
                    nome,
                    telefone,
                    status: 'pendente'
                });

            } catch (error) {
                console.error('Erro ao processar linha da planilha:', error);
                resultados.erros++;
                resultados.detalhes.push({
                    registro: row['V_Nr Registro BO'] || 'Desconhecido',
                    status: 'erro',
                    motivo: error.message
                });
            }
        }

        // Remover o arquivo temporário após processamento
        await fs.remove(filePath);

        return resultados;
    } catch (error) {
        console.error('Erro ao processar planilha:', error);
        throw error;
    }
}

// Obter estatísticas de intimações
async function obterEstatisticas() {
    try {
        const result = await pool.query(`
      SELECT 
        status, 
        COUNT(*) as quantidade 
      FROM 
        intimacoes 
      GROUP BY 
        status
    `);

        const total = await pool.query(`
      SELECT COUNT(*) as total FROM intimacoes
    `);

        return {
            total: parseInt(total.rows[0].total),
            porStatus: result.rows
        };
    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        throw error;
    }
}

// Listar intimações com paginação
async function listarIntimacoes(pagina = 1, limite = 20, filtro = {}) {
    try {
        const offset = (pagina - 1) * limite;

        let query = 'SELECT * FROM intimacoes';
        const params = [];
        let index = 1;

        // Construir filtros se existirem
        if (Object.keys(filtro).length > 0) {
            query += ' WHERE';

            if (filtro.status) {
                query += ` status = $${index}`;
                params.push(filtro.status);
                index++;
            }

            if (filtro.texto) {
                if (params.length > 0) query += ' AND';
                query += ` (nome ILIKE $${index} OR telefone ILIKE $${index} OR bo_registro ILIKE $${index})`;
                params.push(`%${filtro.texto}%`);
                index++;
            }
        }

        // Adicionar ordenação e limites
        query += ` ORDER BY id DESC LIMIT $${index} OFFSET $${index + 1}`;
        params.push(limite, offset);

        const result = await pool.query(query, params);

        // Contar total com os mesmos filtros
        let countQuery = 'SELECT COUNT(*) FROM intimacoes';
        if (Object.keys(filtro).length > 0) {
            countQuery += ' WHERE';

            if (filtro.status) {
                countQuery += ` status = $1`;
                if (filtro.texto) {
                    countQuery += ` AND (nome ILIKE $2 OR telefone ILIKE $2 OR bo_registro ILIKE $2)`;
                }
            } else if (filtro.texto) {
                countQuery += ` (nome ILIKE $1 OR telefone ILIKE $1 OR bo_registro ILIKE $1)`;
            }
        }

        const countParams = [];
        if (filtro.status) countParams.push(filtro.status);
        if (filtro.texto) countParams.push(`%${filtro.texto}%`);

        const countResult = await pool.query(countQuery, countParams);

        return {
            intimacoes: result.rows,
            total: parseInt(countResult.rows[0].count),
            pagina,
            limite,
            paginas: Math.ceil(parseInt(countResult.rows[0].count) / limite)
        };
    } catch (error) {
        console.error('Erro ao listar intimações:', error);
        throw error;
    }
}

// Função para gerar mensagem de comunicado
async function gerarMensagemComunicado(nome) {
    try {
        // Buscar o template de comunicado no banco de dados
        const result = await pool.query('SELECT valor FROM config_sistema WHERE chave = $1', ['template_comunicado']);

        let template;
        if (result.rows.length > 0) {
            template = result.rows[0].valor;
        } else {
            // Template padrão caso não exista no banco
            template = `Olá, {nome}!

Esta é uma mensagem de comunicado importante.

Por favor, mantenha-se atento às nossas comunicações.

Atenciosamente,
Equipe de Comunicação`;
        }

        // Substituir a variável no template
        return template.replace(/{nome}/g, nome);
    } catch (error) {
        console.error('Erro ao gerar mensagem de comunicado:', error);
        throw error;
    }
}

// Função para processar planilha de comunicados
async function processarPlanilhaComunicados(filePath) {
    try {
        console.log(`Processando planilha de comunicados: ${filePath}`);

        // Ler o arquivo
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        console.log(`Encontrados ${data.length} registros na planilha de comunicados`);

        const resultados = {
            total: data.length,
            processados: 0,
            erros: 0,
            detalhes: []
        };

        // Processamento dos registros
        for (const row of data) {
            try {
                const nome = row['nome'] || row['Nome'] || '';
                const telefone = row['telefone'] || row['Telefone'] || '';

                console.log(`Processando comunicado: Nome=${nome}, Telefone=${telefone}`);

                // Pular registros sem telefone ou nome
                if (!telefone || !nome) {
                    console.log(`Pulando registro sem dados essenciais: Nome=${nome}, Telefone=${telefone}`);
                    resultados.detalhes.push({
                        status: 'pulado',
                        motivo: 'Nome ou telefone não informado'
                    });
                    continue;
                }

                // Gerar mensagem personalizada
                const mensagem = await gerarMensagemComunicado(nome);
                console.log(`Mensagem de comunicado gerada para ${nome}`);

                // Inserir no banco de dados
                const result = await pool.query(
                    `INSERT INTO comunicados 
                    (nome, telefone, mensagem, status) 
                    VALUES ($1, $2, $3, $4) 
                    RETURNING id`,
                    [nome, telefone, mensagem, 'pendente']
                );

                console.log(`Comunicado inserido no banco de dados com ID=${result.rows[0].id}`);

                resultados.processados++;
                resultados.detalhes.push({
                    id: result.rows[0].id,
                    nome,
                    telefone,
                    status: 'pendente'
                });

            } catch (error) {
                console.error('Erro ao processar linha da planilha de comunicados:', error);
                resultados.erros++;
                resultados.detalhes.push({
                    status: 'erro',
                    motivo: error.message
                });
            }
        }

        // Remover o arquivo temporário após processamento
        await fs.remove(filePath);

        return resultados;
    } catch (error) {
        console.error('Erro ao processar planilha de comunicados:', error);
        throw error;
    }
}

// Obter estatísticas de comunicados
async function obterEstatisticasComunicados() {
    try {
        const result = await pool.query(`
      SELECT 
        status, 
        COUNT(*) as quantidade 
      FROM 
        comunicados 
      GROUP BY 
        status
    `);

        const total = await pool.query(`
      SELECT COUNT(*) as total FROM comunicados
    `);

        return {
            total: parseInt(total.rows[0].total),
            porStatus: result.rows
        };
    } catch (error) {
        console.error('Erro ao obter estatísticas de comunicados:', error);
        throw error;
    }
}

// Listar comunicados com paginação
async function listarComunicados(pagina = 1, limite = 20, filtro = {}) {
    try {
        const offset = (pagina - 1) * limite;

        let query = 'SELECT * FROM comunicados';
        const params = [];
        let index = 1;

        // Construir filtros se existirem
        if (Object.keys(filtro).length > 0) {
            query += ' WHERE';

            if (filtro.status) {
                query += ` status = $${index}`;
                params.push(filtro.status);
                index++;
            }

            if (filtro.texto && index > 1) {
                query += ` AND (nome ILIKE $${index} OR telefone ILIKE $${index})`;
                params.push(`%${filtro.texto}%`);
                index++;
            } else if (filtro.texto) {
                query += ` (nome ILIKE $${index} OR telefone ILIKE $${index})`;
                params.push(`%${filtro.texto}%`);
                index++;
            }
        }

        query += ` ORDER BY created_at DESC LIMIT $${index} OFFSET $${index + 1}`;
        params.push(limite, offset);

        const result = await pool.query(query, params);

        // Contar total
        let countQuery = 'SELECT COUNT(*) as total FROM comunicados';
        const countParams = [];
        let countIndex = 1;

        if (Object.keys(filtro).length > 0) {
            countQuery += ' WHERE';

            if (filtro.status) {
                countQuery += ` status = $${countIndex}`;
                countParams.push(filtro.status);
                countIndex++;
            }

            if (filtro.texto && countIndex > 1) {
                countQuery += ` AND (nome ILIKE $${countIndex} OR telefone ILIKE $${countIndex})`;
                countParams.push(`%${filtro.texto}%`);
            } else if (filtro.texto) {
                countQuery += ` (nome ILIKE $${countIndex} OR telefone ILIKE $${countIndex})`;
                countParams.push(`%${filtro.texto}%`);
            }
        }

        const totalResult = await pool.query(countQuery, countParams);
        const total = parseInt(totalResult.rows[0].total);

        return {
            comunicados: result.rows,
            total,
            pagina,
            totalPaginas: Math.ceil(total / limite),
            limite
        };
    } catch (error) {
        console.error('Erro ao listar comunicados:', error);
        throw error;
    }
}

module.exports = {
    processarPlanilha,
    obterEstatisticas,
    listarIntimacoes,
    processarPlanilhaComunicados,
    obterEstatisticasComunicados,
    listarComunicados
};
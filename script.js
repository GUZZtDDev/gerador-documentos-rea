// ============================================================
// GERADOR DE DOCUMENTOS REA
// ============================================================

// URL da API do REA
// Substitua pela URL real da Edge Function quando estiver pronta.
const API_URL =
    "https://SEU-PROJETO.supabase.co/functions/v1/get-document-data";


// ============================================================
// MODELOS DE DOCUMENTOS
// ============================================================

const documentModels = {
    documento_criacao_empresa: {
        file: "modelos/criacao-empresa.docx",
        name: "Criação de Empresa",
        outputName: "documento-criacao-empresa.docx"
    },

    documento_admissao_funcionario: {
        file: "modelos/admissao-funcionario.docx",
        name: "Admissão de Funcionário",
        outputName: "documento-admissao-funcionario.docx"
    }
};


// ============================================================
// ELEMENTOS DA INTERFACE
// ============================================================

const packageInput = document.getElementById("packageInput");
const statusElement = document.getElementById("status");
const resultElement = document.getElementById("result");


// ============================================================
// STATUS
// ============================================================

function setStatus(message, type = "info") {
    if (!statusElement) return;

    statusElement.textContent = message;

    statusElement.className = `status ${type}`;
}


// ============================================================
// FORMATADORES
// ============================================================

function formatDate(value) {
    if (!value) return "";

    try {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleDateString("pt-BR");
    } catch {
        return String(value);
    }
}


function formatCurrency(value) {
    if (value === null || value === undefined || value === "") {
        return "";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
        return String(value);
    }

    return `${number.toLocaleString("pt-BR")} AbinaDólares`;
}


function capitalize(value) {
    if (!value) return "";

    const text = String(value);

    return text.charAt(0).toUpperCase() + text.slice(1);
}


// ============================================================
// CRIAÇÃO DE EMPRESA
// ============================================================

function formatFounders(founders) {
    if (!Array.isArray(founders) || founders.length === 0) {
        return "";
    }

    return founders
        .map(founder => founder?.full_name || "")
        .filter(Boolean)
        .join("\n");
}


function formatParticipation(founders) {
    if (!Array.isArray(founders) || founders.length === 0) {
        return "";
    }

    return founders
        .map(founder => {
            if (!founder) return "";

            const name = founder.full_name || "";
            const percentage = founder.ownership_percentage;

            if (!name) return "";

            if (
                percentage === undefined ||
                percentage === null ||
                percentage === ""
            ) {
                return name;
            }

            return `${name} - ${percentage}%`;
        })
        .filter(Boolean)
        .join("\n");
}


function buildCompanyData(pkg) {
    const data = pkg.content_data || {};

    return {
        PEA_DO_ATO: pkg.protocol_number || "",

        SERVICO: pkg.service_type || "",

        FUNCIONARIO: "",

        DATA: formatDate(data.created_at),

        NREA: data.nrea || "",

        NOME_EMPRESA: data.business_name || "",

        NOME_FANTASIA: data.trade_name || "",

        ATIVIDADE_ECONOMICA:
            data.economic_activity || "",

        DATA_CRIACAO:
            formatDate(data.created_at),

        FUNDADORES:
            formatFounders(data.founders),

        SOCIOS: "",

        PARTICIPACAO:
            formatParticipation(data.founders),

        CAPITAL_INICIAL:
            formatCurrency(data.initial_capital),

        SITUACAO:
            capitalize(data.situacao_cadastral)
    };
}


// ============================================================
// ADMISSÃO DE FUNCIONÁRIO
// ============================================================

function buildAdmissionData(pkg) {
    const data = pkg.content_data || {};

    return {
        PEA_DO_ATO:
            pkg.protocol_number || "",

        SERVICO:
            pkg.service_type || "",

        FUNCIONARIO:
            "",

        DATA:
            formatDate(
                data.admission_date ||
                data.hired_at
            ),

        NREA:
            data.nrea || "",

        EMPRESA:
            data.company_name || "",

        // O modelo oficial usa [[CARGO]]
        // nesse campo.
        CARGO:
            data.position || "",

        DATA_ADMISSAO:
            formatDate(
                data.admission_date ||
                data.hired_at
            )
    };
}


// ============================================================
// REGISTRO DOS CAMPOS POR DOCUMENTO
// ============================================================

const documentFieldBuilders = {
    documento_criacao_empresa:
        buildCompanyData,

    documento_admissao_funcionario:
        buildAdmissionData
};


// ============================================================
// DOWNLOAD
// ============================================================

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);

    link.click();

    link.remove();

    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1000);
}


// ============================================================
// GERAR DOCX
// ============================================================

async function generateDocx(pkg) {
    const model =
        documentModels[pkg.document_type];

    if (!model) {
        throw new Error(
            "Não existe modelo para esse tipo de documento."
        );
    }


    const buildFields =
        documentFieldBuilders[pkg.document_type];

    if (!buildFields) {
        throw new Error(
            `Não existe configuração de campos para o documento "${pkg.document_type}".`
        );
    }


    console.log(
        "Tipo de documento:",
        pkg.document_type
    );

    console.log(
        "Modelo:",
        model.file
    );


    // --------------------------------------------------------
    // CARREGAR MODELO DOCX
    // --------------------------------------------------------

    let response;

    try {
        response = await fetch(model.file);
    } catch (error) {
        console.error(
            "ERRO AO BUSCAR MODELO:",
            error
        );

        throw new Error(
            `Não foi possível acessar o modelo DOCX: ${model.file}`
        );
    }


    if (!response.ok) {
        throw new Error(
            `Modelo DOCX não encontrado. HTTP ${response.status}`
        );
    }


    const arrayBuffer =
        await response.arrayBuffer();


    console.log(
        "Modelo carregado:",
        arrayBuffer.byteLength,
        "bytes"
    );


    // --------------------------------------------------------
    // ABRIR DOCX
    // --------------------------------------------------------

    let zip;

    try {
        zip = new PizZip(arrayBuffer);
    } catch (error) {
        console.error(
            "ERRO NO PIZZIP:",
            error
        );

        throw new Error(
            "O arquivo encontrado não é um DOCX válido."
        );
    }


    // --------------------------------------------------------
    // DOCXTEMPLATER
    // --------------------------------------------------------

    const doc =
        new window.docxtemplater(
            zip,
            {
                paragraphLoop: true,

                linebreaks: true,

                delimiters: {
                    start: "[[",
                    end: "]]"
                }
            }
        );


    // --------------------------------------------------------
    // MONTAR CAMPOS
    // --------------------------------------------------------

    let fields;

    try {
        fields = buildFields(pkg);
    } catch (error) {
        console.error(
            "ERRO AO MONTAR CAMPOS:",
            error
        );

        throw new Error(
            "Não foi possível preparar os dados do documento."
        );
    }


    console.log(
        "Campos enviados para o modelo:",
        fields
    );


    // --------------------------------------------------------
    // PREENCHER DOCX
    // --------------------------------------------------------

    try {
        doc.render(fields);
    } catch (error) {
        console.error(
            "ERRO AO PREENCHER DOCX:",
            error
        );

        throw new Error(
            "Não foi possível preencher o modelo DOCX. " +
            "Verifique os marcadores [[...]] no arquivo."
        );
    }


    // --------------------------------------------------------
    // GERAR ARQUIVO
    // --------------------------------------------------------

    const blob =
        doc.getZip().generate({
            type: "blob",

            mimeType:
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        });


    console.log(
        "Documento gerado:",
        blob.size,
        "bytes"
    );


    // --------------------------------------------------------
    // DOWNLOAD
    // --------------------------------------------------------

    downloadBlob(
        blob,
        model.outputName
    );


    return blob;
}


// ============================================================
// VALIDAR PACOTE
// ============================================================

function parsePackage(rawText) {
    if (!rawText || !rawText.trim()) {
        throw new Error(
            "Cole o pacote JSON antes de continuar."
        );
    }


    let pkg;

    try {
        pkg = JSON.parse(
            rawText.trim()
        );
    } catch (error) {
        console.error(
            "JSON inválido:",
            error
        );

        throw new Error(
            "O pacote não contém um JSON válido."
        );
    }


    const requiredFields = [
        "doc_id",
        "protocol_id",
        "document_type",
        "protocol_number",
        "service_type",
        "content_data",
        "checksum"
    ];


    for (const field of requiredFields) {
        if (
            pkg[field] === undefined ||
            pkg[field] === null
        ) {
            throw new Error(
                `Campo obrigatório ausente: ${field}`
            );
        }
    }


    if (
        typeof pkg.content_data !==
        "object"
    ) {
        throw new Error(
            "O campo content_data é inválido."
        );
    }


    return pkg;
}


// ============================================================
// MOSTRAR INFORMAÇÕES DO PACOTE
// ============================================================

function showPackageInfo(pkg) {
    if (!resultElement) return;


    const model =
        documentModels[pkg.document_type];


    const data =
        pkg.content_data || {};


    resultElement.innerHTML = `
        <div class="document-info">

            <h2>
                ${escapeHtml(
                    model?.name ||
                    pkg.document_type
                )}
            </h2>

            <div class="info-row">
                <strong>PEA:</strong>
                <span>
                    ${escapeHtml(
                        pkg.protocol_number
                    )}
                </span>
            </div>

            <div class="info-row">
                <strong>Serviço:</strong>
                <span>
                    ${escapeHtml(
                        pkg.service_type
                    )}
                </span>
            </div>

            <div class="info-row">
                <strong>ID do documento:</strong>
                <span>
                    ${escapeHtml(
                        pkg.doc_id
                    )}
                </span>
            </div>

            <div class="info-row">
                <strong>Tipo:</strong>
                <span>
                    ${escapeHtml(
                        pkg.document_type
                    )}
                </span>
            </div>

            <hr>

            <h3>
                Dados do documento
            </h3>

            <div class="content-data">
                ${renderContentData(
                    data
                )}
            </div>

        </div>
    `;
}


// ============================================================
// RENDERIZAR CONTENT_DATA
// ============================================================

const fieldTranslations = {
    nrea: "NREA",

    hired_at:
        "Data de Contratação",

    position:
        "Cargo",

    company_name:
        "Empresa",

    employee_name:
        "Funcionário",

    admission_date:
        "Data de Admissão",

    founders:
        "Fundadores",

    created_at:
        "Data de Criação",

    trade_name:
        "Nome Fantasia",

    business_name:
        "Razão Social",

    initial_capital:
        "Capital Inicial",

    economic_activity:
        "Atividade Econômica",

    situacao_cadastral:
        "Situação Cadastral"
};


function translateFieldName(key) {
    return (
        fieldTranslations[key] ||
        key
    );
}


function renderContentData(data) {
    if (
        !data ||
        typeof data !== "object"
    ) {
        return "";
    }


    return Object.entries(data)
        .map(([key, value]) => {

            // Nunca mostrar CPF
            if (
                key.toLowerCase()
                    .includes("cpf")
            ) {
                return "";
            }


            let displayValue;


            if (Array.isArray(value)) {

                displayValue =
                    value
                        .map(item => {

                            if (
                                typeof item ===
                                "object"
                            ) {

                                return Object.entries(
                                    item
                                )
                                    .filter(
                                        ([itemKey]) =>
                                            !itemKey
                                                .toLowerCase()
                                                .includes("cpf")
                                    )
                                    .map(
                                        ([itemKey, itemValue]) =>
                                            `${translateFieldName(itemKey)}: ${formatDisplayValue(itemValue)}`
                                    )
                                    .join(" | ");

                            }


                            return formatDisplayValue(
                                item
                            );
                        })
                        .join("<br>");

            } else {

                displayValue =
                    formatDisplayValue(
                        value
                    );
            }


            return `
                <div class="data-field">

                    <strong>
                        ${escapeHtml(
                            translateFieldName(
                                key
                            )
                        )}
                    </strong>

                    <span>
                        ${displayValue}
                    </span>

                </div>
            `;
        })
        .join("");
}


function formatDisplayValue(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    if (
        typeof value === "object"
    ) {
        return escapeHtml(
            JSON.stringify(
                value
            )
        );
    }


    return escapeHtml(
        String(value)
    ).replace(
        /\n/g,
        "<br>"
    );
}


// ============================================================
// SEGURANÇA HTML
// ============================================================

function escapeHtml(value) {
    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


// ============================================================
// VERIFICAÇÃO COM O REA
// ============================================================

async function verifyWithREA(pkg) {

    // Se ainda estiver usando o placeholder,
    // não tenta chamar uma API inexistente.
    if (
        !API_URL ||
        API_URL.includes(
            "SEU-PROJETO"
        )
    ) {

        console.warn(
            "API do REA ainda não configurada."
        );

        return {
            verified: false,

            localOnly: true,

            message:
                "API do REA ainda não configurada."
        };
    }


    const url =
        new URL(API_URL);


    url.searchParams.set(
        "doc_id",
        pkg.doc_id
    );


    url.searchParams.set(
        "checksum",
        pkg.checksum
    );


    let response;


    try {

        response =
            await fetch(
                url.toString(),
                {
                    method: "GET",

                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );

    } catch (error) {

        console.error(
            "ERRO AO CONSULTAR REA:",
            error
        );

        throw new Error(
            "Não foi possível consultar o REA."
        );
    }


    if (!response.ok) {

        let message =
            `REA respondeu com HTTP ${response.status}.`;


        try {

            const errorData =
                await response.json();

            if (
                errorData?.error
            ) {
                message =
                    errorData.error;
            }

        } catch {
            // Mantém mensagem padrão.
        }


        throw new Error(
            message
        );
    }


    const serverData =
        await response.json();


    if (
        serverData.valid !== true
    ) {
        throw new Error(
            "O REA não validou este documento."
        );
    }


    // --------------------------------------------------------
    // COMPARAÇÃO DOS DADOS
    // --------------------------------------------------------

    const serverContent =
        serverData.content_data;


    const localContent =
        pkg.content_data;


    if (
        JSON.stringify(
            serverContent
        ) !==
        JSON.stringify(
            localContent
        )
    ) {

        console.error(
            "Dados locais:",
            localContent
        );

        console.error(
            "Dados do servidor:",
            serverContent
        );


        throw new Error(
            "Os dados do pacote não correspondem aos dados atuais do REA."
        );
    }


    if (
        serverData.doc_id !==
        pkg.doc_id
    ) {
        throw new Error(
            "O ID do documento não corresponde ao REA."
        );
    }


    if (
        serverData.protocol_number !==
        pkg.protocol_number
    ) {
        throw new Error(
            "O número do protocolo não corresponde ao REA."
        );
    }


    if (
        serverData.document_type !==
        pkg.document_type
    ) {
        throw new Error(
            "O tipo do documento não corresponde ao REA."
        );
    }


    return {
        verified: true,

        localOnly: false,

        serverData
    };
}


// ============================================================
// PROCESSAR PACOTE
// ============================================================

async function processPackage() {

    try {

        setStatus(
            "Lendo pacote...",
            "loading"
        );


        const rawText =
            packageInput?.value || "";


        const pkg =
            parsePackage(
                rawText
            );


        console.log(
            "Pacote recebido:",
            pkg
        );


        // ----------------------------------------------------
        // VERIFICAR SE EXISTE MODELO
        // ----------------------------------------------------

        const model =
            documentModels[
                pkg.document_type
            ];


        if (!model) {

            throw new Error(
                `O gerador ainda não possui um modelo para "${pkg.document_type}".`
            );
        }


        // ----------------------------------------------------
        // MOSTRAR DADOS
        // ----------------------------------------------------

        showPackageInfo(
            pkg
        );


        setStatus(
            "Verificando documento...",
            "loading"
        );


        // ----------------------------------------------------
        // VERIFICAR COM REA
        // ----------------------------------------------------

        const verification =
            await verifyWithREA(
                pkg
            );


        if (
            verification.localOnly
        ) {

            setStatus(
                "Pacote válido. API do REA ainda não configurada.",
                "warning"
            );

        } else {

            setStatus(
                "Documento validado pelo REA.",
                "success"
            );
        }


        return pkg;

    } catch (error) {

        console.error(
            "ERRO:",
            error
        );


        setStatus(
            error.message ||
            "Erro ao processar documento.",
            "error"
        );


        throw error;
    }
}


// ============================================================
// BOTÃO GERAR DOCUMENTO
// ============================================================

async function generateCurrentDocument() {

    try {

        const pkg =
            await processPackage();


        setStatus(
            "Gerando documento...",
            "loading"
        );


        await generateDocx(
            pkg
        );


        setStatus(
            "Documento gerado com sucesso!",
            "success"
        );

    } catch (error) {

        console.error(
            "Erro ao gerar documento:",
            error
        );

        setStatus(
            error.message ||
            "Não foi possível gerar o documento.",
            "error"
        );
    }
}


// ============================================================
// EVENTOS
// ============================================================

const generateButton =
    document.getElementById(
        "generateButton"
    );


if (generateButton) {

    generateButton.addEventListener(
        "click",
        generateCurrentDocument
    );
}


// Botão opcional para apenas validar
const verifyButton =
    document.getElementById(
        "verifyButton"
    );


if (verifyButton) {

    verifyButton.addEventListener(
        "click",
        async () => {

            try {

                await processPackage();

            } catch {
                // O erro já foi mostrado no status.
            }

        }
    );
}


// ============================================================
// EXPOR FUNÇÕES ÚTEIS
// ============================================================

window.REAGenerator = {

    parsePackage,

    verifyWithREA,

    generateDocx,

    generateCurrentDocument,

    buildCompanyData,

    buildAdmissionData,

    documentModels

};


console.log(
    "Gerador de Documentos REA carregado."
);

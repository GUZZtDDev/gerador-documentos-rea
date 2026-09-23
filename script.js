// ============================================================
// GERADOR DE DOCUMENTOS REA
// ============================================================


// ============================================================
// CONFIGURAÇÃO
// ============================================================

const API_URL =
    "https://mmxbckoewggaxyupieup.supabase.co/functions/v1/get-document-data";


// ============================================================
// MODELOS DISPONÍVEIS
// ============================================================

const documentModels = {

    documento_criacao_empresa: {

        file:
            "modelos/criacao-empresa.docx",

        name:
            "Criação de Empresa",

        outputName:
            "documento-criacao-empresa.docx"
    },


    documento_admissao_funcionario: {

        file:
            "modelos/admissao-funcionario.docx",

        name:
            "Admissão de Funcionário",

        outputName:
            "documento-admissao-funcionario.docx"
    },


    documento_desligamento_funcionario: {

        file:
            "modelos/desligamento-funcionario.docx",

        name:
            "Desligamento de Funcionário",

        outputName:
            "documento-desligamento-funcionario.docx"
    },


    documento_admissao_socio: {

        file:
            "modelos/admissao-socio.docx",

        name:
            "Admissão de Sócio",

        outputName:
            "documento-admissao-socio.docx"
    },


    documento_desligamento_socio: {

        file:
            "modelos/desligamento-socio.docx",

        name:
            "Desligamento de Sócio",

        outputName:
            "documento-desligamento-socio.docx"
    }
};


// ============================================================
// ELEMENTOS DA PÁGINA
// ============================================================

const packageInput =
    document.getElementById("jsonInput");

const generateButton =
    document.getElementById("generateButton");

const verifyButton =
    document.getElementById("verifyButton");

const statusElement =
    document.getElementById("status");

const resultElement =
    document.getElementById("result");


// ============================================================
// STATUS
// ============================================================

function setStatus(
    message,
    type = "info"
) {

    if (!statusElement) {
        return;
    }

    statusElement.textContent =
        message;

    statusElement.className =
        `status ${type}`;
}


// ============================================================
// ESCAPAR HTML
// ============================================================

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ============================================================
// DATA
// ============================================================

function formatDate(value) {

    if (!value) {
        return "";
    }

    const text =
        String(value);

    // YYYY-MM-DD
    if (
        /^\d{4}-\d{2}-\d{2}$/.test(text)
    ) {

        const [
            year,
            month,
            day
        ] =
            text.split("-");

        return `${day}/${month}/${year}`;
    }


    // ISO
    if (
        text.includes("T")
    ) {

        const date =
            new Date(text);

        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {

            return date.toLocaleDateString(
                "pt-BR"
            );
        }
    }


    return text;
}


// ============================================================
// MOEDA
// ============================================================

function formatCurrency(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "";
    }

    const number =
        Number(value);

    if (
        Number.isNaN(number)
    ) {
        return String(value);
    }

    return number.toLocaleString(
        "pt-BR",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}


// ============================================================
// LIMPAR NOME DE ARQUIVO
// ============================================================

function sanitizeFileName(value) {

    if (!value) {
        return "";
    }

    return String(value)

        .replace(
            /[<>:"/\\|?*\x00-\x1F]/g,
            ""
        )

        .replace(
            /\s+/g,
            " "
        )

        .trim()

        .replace(
            /[. ]+$/,
            ""
        );
}


// ============================================================
// NOME DO ARQUIVO
// ============================================================

function getOutputFileName(
    pkg
) {

    const data =
        pkg.content_data ||
        {};

    const pea =
        pkg.protocol_number ||
        "SEM-PEA";


    switch (
        pkg.document_type
    ) {

        case "documento_criacao_empresa": {

            const companyName =
                data.business_name ||
                data.company_name ||
                data.trade_name ||
                "Empresa";

            return sanitizeFileName(
                `Criação de Empresa - ${companyName} - ${pea}.docx`
            );
        }


        case "documento_admissao_funcionario": {

            const employeeName =
                data.employee_name ||
                "Funcionário";

            return sanitizeFileName(
                `Contratação de Funcionário - ${employeeName} - ${pea}.docx`
            );
        }


        case "documento_desligamento_funcionario": {

            const employeeName =
                data.employee_name ||
                "Funcionário";

            return sanitizeFileName(
                `Desligamento de Funcionário - ${employeeName} - ${pea}.docx`
            );
        }


        case "documento_admissao_socio": {

            const partnerName =
                data.new_partner_name ||
                data.socio_novo ||
                data.partner_name ||
                "Sócio";

            return sanitizeFileName(
                `Admissão de Sócio - ${partnerName} - ${pea}.docx`
            );
        }


        case "documento_desligamento_socio": {

            const partnerName =
                data.partner_name ||
                data.socio_desligado ||
                data.removed_partner_name ||
                "Sócio";

            return sanitizeFileName(
                `Desligamento de Sócio - ${partnerName} - ${pea}.docx`
            );
        }


        default:

            return sanitizeFileName(
                `Documento REA - ${pea}.docx`
            );
    }
}


// ============================================================
// URL DE VERIFICAÇÃO
// ============================================================

function getVerificationUrl(pkg) {

    const data =
        pkg.content_data ||
        {};

    return (
        pkg.verification_url ||
        pkg.verificationUrl ||
        data.verification_url ||
        data.verificationUrl ||
        ""
    );
}


// ============================================================
// CRIAÇÃO DE EMPRESA
// ============================================================

function buildCompanyData(
    pkg
) {

    const data =
        pkg.content_data ||
        {};


    const founders =
        Array.isArray(data.founders)
            ? data.founders
            : [];


    const founderNames =
        founders
            .map(
                founder =>
                    (
                        founder.full_name ||
                        founder.name ||
                        ""
                    ).trim()
            )
            .filter(Boolean);


    const founderOwnership =
        founders
            .map(
                founder => {

                    const name =
                        (
                            founder.full_name ||
                            founder.name ||
                            ""
                        ).trim();

                    const percentage =
                        founder.ownership_percentage;


                    if (!name) {
                        return "";
                    }


                    if (
                        percentage !== null &&
                        percentage !== undefined &&
                        percentage !== ""
                    ) {

                        return `${name} - ${percentage}%`;
                    }


                    return name;
                }
            )
            .filter(Boolean);


    const participationText =
        founderOwnership.join(
            "; "
        );


    return {

        PEA_DO_ATO:
            pkg.protocol_number ||
            "",

        SERVICO:
            pkg.service_type ||
            "",

        FUNCIONARIO:
            "",

        DATA:
            formatDate(
                data.created_at
            ),

        NREA:
            data.nrea ||
            "",

        NOME_EMPRESA:
            data.business_name ||
            "",

        EMPRESA:
            data.business_name ||
            "",

        NOME_FANTASIA:
            data.trade_name ||
            "",

        ATIVIDADE_ECONOMICA:
            data.economic_activity ||
            "",

        DATA_CRIACAO:
            formatDate(
                data.created_at
            ),

        FUNDADORES:
            founderNames.join(
                ", "
            ),

        SOCIOS:
            founderNames.join(
                ", "
            ),

        PARTICIPACAO_SOCIETARIA:
            participationText,

        ALTERACAO_SOCIETARIA:
            participationText,

        CAPITAL_INICIAL:
            formatCurrency(
                data.initial_capital
            ),

        SITUACAO:
            data.situacao_cadastral ||
            "",

        SITUACAO_CADASTRAL:
            data.situacao_cadastral ||
            "",

        VERIFICACAO_URL:
            getVerificationUrl(pkg)
    };
}


// ============================================================
// ADMISSÃO DE FUNCIONÁRIO
// ============================================================

function buildAdmissionData(
    pkg
) {

    const data =
        pkg.content_data ||
        {};


    return {

        PEA_DO_ATO:
            pkg.protocol_number ||
            "",

        SERVICO:
            pkg.service_type ||
            "",

        FUNCIONARIO:
            data.employee_name ||
            "",

        DATA:
            formatDate(
                data.admission_date ||
                data.hired_at
            ),

        NREA:
            data.nrea ||
            "",

        EMPRESA:
            data.company_name ||
            "",

        FUNCIONARIO_EMPRESA:
            data.employee_name ||
            "",

        CARGO:
            data.position ||
            "",

        DATA_ADMISSAO:
            formatDate(
                data.admission_date ||
                data.hired_at
            ),

        VERIFICACAO_URL:
            getVerificationUrl(pkg)
    };
}


// ============================================================
// DESLIGAMENTO DE FUNCIONÁRIO
// ============================================================

function buildTerminationData(
    pkg
) {

    const data =
        pkg.content_data ||
        {};


    return {

        PEA_DO_ATO:
            pkg.protocol_number ||
            "",

        SERVICO:
            pkg.service_type ||
            "",

        FUNCIONARIO:
            "",

        DATA:
            formatDate(
                data.termination_date ||
                data.dismissal_date ||
                data.terminated_at ||
                data.termination_at ||
                data.dismissed_at
            ),

        NREA:
            data.nrea ||
            "",

        EMPRESA:
            data.company_name ||
            "",

        FUNCIONARIO_AFETADO:
            data.employee_name ||
            "",

        DATA_ADMISSAO:
            formatDate(
                data.admission_date ||
                data.hired_at
            ),

        CARGO:
            data.position ||
            "",

        VERIFICACAO_URL:
            getVerificationUrl(pkg)
    };
}


// ============================================================
// ADMISSÃO DE SÓCIO
// ============================================================

function buildPartnerAdmissionData(
    pkg
) {

    const data =
        pkg.content_data ||
        {};


    return {

        PEA_DO_ATO:
            pkg.protocol_number ||
            "",

        SERVICO:
            pkg.service_type ||
            "",

        FUNCIONARIO:
            data.employee_name ||
            data.responsible_name ||
            data.funcionario ||
            "",

        DATA:
            formatDate(
                data.created_at ||
                data.admission_date ||
                data.date
            ),

        NREA:
            data.nrea ||
            "",

        EMPRESA:
            data.company_name ||
            data.business_name ||
            "",

        SOCIO_NOVO:
            data.new_partner_name ||
            data.socio_novo ||
            data.partner_name ||
            "",

        PARTICIPACAO_SOCIO:
            data.new_partner_ownership ??
            data.ownership_percentage ??
            data.partner_ownership ??
            "",

        MOTIVO:
            data.reason ||
            data.motivo ||
            "",

        SOCIOS_ATUAIS:
            data.current_partners ||
            data.socios_atuais ||
            "",

        NOVA_DISTRIBUICAO:
            data.new_ownership_distribution ||
            data.nova_distribuicao_societaria ||
            "",

        VERIFICACAO_URL:
            getVerificationUrl(pkg)
    };
}


// ============================================================
// DESLIGAMENTO DE SÓCIO
// ============================================================

function buildPartnerTerminationData(
    pkg
) {

    const data =
        pkg.content_data ||
        {};


    return {

        PEA_DO_ATO:
            pkg.protocol_number ||
            "",

        SERVICO:
            pkg.service_type ||
            "",

        FUNCIONARIO:
            data.employee_name ||
            data.responsible_name ||
            data.funcionario ||
            "",

        DATA:
            formatDate(
                data.created_at ||
                data.termination_date ||
                data.date
            ),

        NREA:
            data.nrea ||
            "",

        EMPRESA:
            data.company_name ||
            data.business_name ||
            "",

        SOCIO_DESLIGADO:
            data.partner_name ||
            data.socio_desligado ||
            data.removed_partner_name ||
            "",

        PARTICIPACAO_SOCIO_ANTERIOR:
            data.previous_partner_ownership ??
            data.previous_ownership_percentage ??
            data.partner_ownership ??
            "",

        MOTIVO:
            data.reason ||
            data.motivo ||
            "",

        SOCIOS_REMANESCENTES:
            data.remaining_partners ||
            data.socios_remanescentes ||
            "",

        NOVA_DISTRIBUICAO:
            data.new_ownership_distribution ||
            data.nova_distribuicao_societaria ||
            "",

        VERIFICACAO_URL:
            getVerificationUrl(pkg)
    };
}


// ============================================================
// CONSTRUTORES DOS DOCUMENTOS
// ============================================================

const documentFieldBuilders = {

    documento_criacao_empresa:
        buildCompanyData,

    documento_admissao_funcionario:
        buildAdmissionData,

    documento_desligamento_funcionario:
        buildTerminationData,

    documento_admissao_socio:
        buildPartnerAdmissionData,

    documento_desligamento_socio:
        buildPartnerTerminationData
};


// ============================================================
// TRADUÇÃO DOS CAMPOS
// ============================================================

const fieldTranslations = {

    nrea:
        "NREA",

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

    termination_date:
        "Data de Desligamento",

    dismissal_date:
        "Data de Desligamento",

    terminated_at:
        "Data de Desligamento",

    termination_at:
        "Data de Desligamento",

    dismissed_at:
        "Data de Desligamento",

    business_name:
        "Razão Social",

    trade_name:
        "Nome Fantasia",

    created_at:
        "Data de Criação",

    initial_capital:
        "Capital Inicial",

    economic_activity:
        "Atividade Econômica",

    situacao_cadastral:
        "Situação Cadastral",

    founders:
        "Fundadores",

    employee_cpf:
        "CPF"
};


// ============================================================
// VALIDAR PACOTE
// ============================================================

function validatePackage(
    pkg
) {

    if (!pkg) {

        throw new Error(
            "Pacote vazio."
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


    for (
        const field
        of requiredFields
    ) {

        if (
            pkg[field] === undefined ||
            pkg[field] === null ||
            pkg[field] === ""
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
            "content_data inválido."
        );
    }


    if (
        !documentModels[
            pkg.document_type
        ]
    ) {

        throw new Error(
            `Modelo não encontrado: ${pkg.document_type}`
        );
    }


    if (
        !documentFieldBuilders[
            pkg.document_type
        ]
    ) {

        throw new Error(
            `Configuração do documento não encontrada: ${pkg.document_type}`
        );
    }


    return true;
}


// ============================================================
// LER JSON
// ============================================================

function parsePackage(
    rawText
) {

    if (
        !rawText ||
        !rawText.trim()
    ) {

        throw new Error(
            "Cole o pacote JSON antes de continuar."
        );
    }


    let pkg;


    try {

        pkg =
            JSON.parse(
                rawText.trim()
            );

    } catch (error) {

        console.error(
            "Erro no JSON:",
            error
        );

        throw new Error(
            "O pacote não contém um JSON válido."
        );
    }


    validatePackage(
        pkg
    );


    return pkg;
}


// ============================================================
// RENDERIZAR CONTEÚDO
// ============================================================

function renderContentData(
    contentData
) {

    if (
        !contentData ||
        typeof contentData !== "object"
    ) {

        return "";
    }


    let html = "";


    for (
        const [
            key,
            value
        ]
        of Object.entries(
            contentData
        )
    ) {

        if (
            key.toLowerCase()
                .includes("cpf")
        ) {
            continue;
        }


        const label =
            fieldTranslations[key] ||
            key;


        let displayValue;


        if (
            Array.isArray(value)
        ) {

            displayValue =
                value
                    .map(
                        item => {

                            if (
                                typeof item ===
                                "object"
                            ) {

                                return Object.entries(
                                    item
                                )
                                    .filter(
                                        (
                                            [
                                                itemKey
                                            ]
                                        ) =>
                                            !itemKey
                                                .toLowerCase()
                                                .includes("cpf")
                                    )
                                    .map(
                                        (
                                            [
                                                itemKey,
                                                itemValue
                                            ]
                                        ) =>
                                            `${itemKey}: ${itemValue}`
                                    )
                                    .join(
                                        ", "
                                    );
                            }


                            return String(
                                item
                            );
                        }
                    )
                    .join(
                        "<br>"
                    );

        } else if (
            typeof value === "object" &&
            value !== null
        ) {

            displayValue =
                Object.entries(
                    value
                )
                    .filter(
                        (
                            [
                                itemKey
                            ]
                        ) =>
                            !itemKey
                                .toLowerCase()
                                .includes("cpf")
                    )
                    .map(
                        (
                            [
                                itemKey,
                                itemValue
                            ]
                        ) =>
                            `${itemKey}: ${itemValue}`
                    )
                    .join(
                        "<br>"
                    );

        } else {

            displayValue =
                escapeHtml(
                    value
                );
        }


        html += `

            <div class="field">

                <strong>
                    ${escapeHtml(label)}
                </strong>

                <div>
                    ${displayValue}
                </div>

            </div>
        `;
    }


    return html;
}


// ============================================================
// MOSTRAR INFORMAÇÕES
// ============================================================

function showPackageInfo(
    pkg
) {

    if (!resultElement) {
        return;
    }


    const model =
        documentModels[
            pkg.document_type
        ];


    resultElement.innerHTML = `

        <div class="package-info">

            <h3>
                ${escapeHtml(model.name)}
            </h3>


            <div class="field">

                <strong>
                    Documento
                </strong>

                <div>
                    ${escapeHtml(
                        pkg.document_type
                    )}
                </div>

            </div>


            <div class="field">

                <strong>
                    PEA
                </strong>

                <div>
                    ${escapeHtml(
                        pkg.protocol_number
                    )}
                </div>

            </div>


            <div class="field">

                <strong>
                    Serviço
                </strong>

                <div>
                    ${escapeHtml(
                        pkg.service_type
                    )}
                </div>

            </div>


            <h4>
                Dados do documento
            </h4>


            ${renderContentData(
                pkg.content_data
            )}

        </div>
    `;
}


// ============================================================
// BAIXAR ARQUIVO
// ============================================================

function downloadBlob(
    blob,
    fileName
) {

    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;

    link.download =
        fileName;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    setTimeout(
        () => {

            URL.revokeObjectURL(
                url
            );

        },
        1000
    );
}


// ============================================================
// VERIFICAR COM O REA
// ============================================================

async function verifyWithREA(
    pkg
) {

    if (
        !API_URL ||
        API_URL.includes(
            "SEU-PROJETO"
        )
    ) {

        throw new Error(
            "A URL da API do REA ainda não foi configurada."
        );
    }


    const url =
        new URL(
            API_URL
        );


    url.searchParams.set(
        "doc_id",
        pkg.doc_id
    );


    url.searchParams.set(
        "checksum",
        pkg.checksum
    );


    const response =
        await fetch(
            url.toString(),
            {
                method:
                    "GET",

                headers: {
                    Accept:
                        "application/json"
                }
            }
        );


    let responseData;


    try {

        responseData =
            await response.json();

    } catch {

        throw new Error(
            "O REA retornou uma resposta inválida."
        );
    }


    if (
        !response.ok
    ) {

        throw new Error(
            responseData.message ||
            responseData.error ||
            `Erro na API do REA: HTTP ${response.status}`
        );
    }


    if (
        responseData.valid === false
    ) {

        throw new Error(
            "O documento não foi validado pelo REA."
        );
    }


    return responseData;
}


// ============================================================
// COMPARAR PACOTE COM REA
// ============================================================

function comparePackageWithServer(
    pkg,
    serverData
) {

    if (!serverData) {
        return false;
    }


    const checks = [

        [
            "doc_id",
            pkg.doc_id,
            serverData.doc_id
        ],

        [
            "protocol_id",
            pkg.protocol_id,
            serverData.protocol_id
        ],

        [
            "protocol_number",
            pkg.protocol_number,
            serverData.protocol_number
        ],

        [
            "document_type",
            pkg.document_type,
            serverData.document_type
        ],

        [
            "service_type",
            pkg.service_type,
            serverData.service_type
        ]
    ];


    for (
        const [
            name,
            localValue,
            serverValue
        ]
        of checks
    ) {

        if (
            String(localValue) !==
            String(serverValue)
        ) {

            console.error(
                `Divergência em ${name}:`,
                {
                    pacote:
                        localValue,

                    servidor:
                        serverValue
                }
            );


            return false;
        }
    }


    return true;
}


// ============================================================
// CARREGAR MODELO DOCX
// ============================================================

async function loadTemplate(
    filePath
) {

    const response =
        await fetch(
            filePath,
            {
                cache:
                    "no-store"
            }
        );


    if (
        !response.ok
    ) {

        throw new Error(
            `Não foi possível carregar o modelo: ${filePath}`
        );
    }


    return await response.arrayBuffer();
}


// ============================================================
// GERAR DOCX
// ============================================================

async function generateDocx(
    pkg
) {

    if (
        !window.PizZip
    ) {

        throw new Error(
            "PizZip não foi carregado."
        );
    }


    if (
        !window.docxtemplater
    ) {

        throw new Error(
            "Docxtemplater não foi carregado."
        );
    }


    const model =
        documentModels[
            pkg.document_type
        ];


    if (!model) {

        throw new Error(
            `Modelo não encontrado: ${pkg.document_type}`
        );
    }


    const buildFields =
        documentFieldBuilders[
            pkg.document_type
        ];


    if (!buildFields) {

        throw new Error(
            `Construtor não encontrado: ${pkg.document_type}`
        );
    }


    const fields =
        buildFields(
            pkg
        );


    console.log(
        "Campos enviados ao modelo:",
        fields
    );


    const arrayBuffer =
        await loadTemplate(
            model.file
        );


    const zip =
        new window.PizZip(
            arrayBuffer
        );


    const doc =
        new window.docxtemplater(
            zip,
            {
                paragraphLoop:
                    true,

                linebreaks:
                    true,

                delimiters: {

                    start:
                        "[[",

                    end:
                        "]]"
                }
            }
        );


    try {

        doc.render(
            fields
        );

    } catch (error) {

        console.error(
            "Erro ao preencher DOCX:",
            error
        );


        throw new Error(
            "Não foi possível preencher o modelo DOCX. Verifique se os placeholders [[...]] estão corretos."
        );
    }


    const outputBlob =
        doc.getZip()
            .generate(
                {
                    type:
                        "blob",

                    mimeType:
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                }
            );


    return outputBlob;
}


// ============================================================
// PROCESSAR PACOTE
// ============================================================

async function processPackage(
    options = {}
) {

    try {

        setStatus(
            "Lendo pacote...",
            "loading"
        );


        const rawText =
            packageInput?.value ||
            "";


        const pkg =
            parsePackage(
                rawText
            );


        console.log(
            "Pacote recebido:",
            pkg
        );


        showPackageInfo(
            pkg
        );


        if (
            options.verify !== false
        ) {

            setStatus(
                "Verificando documento no REA...",
                "loading"
            );


            const serverData =
                await verifyWithREA(
                    pkg
                );


            if (
                !comparePackageWithServer(
                    pkg,
                    serverData
                )
            ) {

                throw new Error(
                    "Os dados do pacote não coincidem com os dados do REA."
                );
            }


            // Dados oficiais do REA
            if (
                serverData.content_data
            ) {

                pkg.content_data =
                    serverData.content_data;
            }


            // URL de verificação
            if (
                serverData.verification_url
            ) {

                pkg.verification_url =
                    serverData.verification_url;

            } else if (
                serverData.verificationUrl
            ) {

                pkg.verification_url =
                    serverData.verificationUrl;
            }


            console.log(
                "Documento validado pelo REA."
            );
        }


        setStatus(
            "Documento validado e pronto para geração.",
            "success"
        );


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
// GERAR DOCUMENTO ATUAL
// ============================================================

async function generateCurrentDocument() {

    try {

        const pkg =
            await processPackage();


        setStatus(
            "Gerando documento...",
            "loading"
        );


        const blob =
            await generateDocx(
                pkg
            );


        const fileName =
            getOutputFileName(
                pkg
            );


        downloadBlob(
            blob,
            fileName
        );


        setStatus(
            `Documento gerado: ${fileName}`,
            "success"
        );


        console.log(
            "Documento gerado:",
            fileName
        );


    } catch (error) {

        console.error(
            "Erro ao gerar documento:",
            error
        );


        setStatus(
            error.message ||
            "Erro ao gerar documento.",
            "error"
        );
    }
}


// ============================================================
// VERIFICAR DOCUMENTO
// ============================================================

async function verifyCurrentDocument() {

    try {

        const pkg =
            await processPackage();


        setStatus(
            "Documento verificado com sucesso.",
            "success"
        );


        showPackageInfo(
            pkg
        );


    } catch (error) {

        console.error(
            "Erro na verificação:",
            error
        );
    }
}


// ============================================================
// BOTÃO GERAR
// ============================================================

if (
    generateButton
) {

    generateButton.addEventListener(
        "click",
        generateCurrentDocument
    );
}


// ============================================================
// BOTÃO VERIFICAR
// ============================================================

if (
    verifyButton
) {

    verifyButton.addEventListener(
        "click",
        verifyCurrentDocument
    );
}


// ============================================================
// CTRL + ENTER
// ============================================================

if (
    packageInput
) {

    packageInput.addEventListener(
        "keydown",
        event => {

            if (
                event.ctrlKey &&
                event.key === "Enter"
            ) {

                event.preventDefault();

                generateCurrentDocument();
            }
        }
    );
}


// ============================================================
// DIAGNÓSTICO
// ============================================================

console.log(
    "Gerador de Documentos REA carregado."
);


console.log(
    "Modelos disponíveis:",
    Object.keys(
        documentModels
    )
);


console.log(
    "Construtores disponíveis:",
    Object.keys(
        documentFieldBuilders
    )
);


// ============================================================
// API PÚBLICA
// ============================================================

window.REAGenerator = {

    documentModels,

    documentFieldBuilders,

    parsePackage,

    validatePackage,

    generateDocx,

    processPackage,

    getOutputFileName
};

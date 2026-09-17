const jsonInput = document.getElementById("jsonInput");
const generateButton = document.getElementById("generateButton");
const statusBox = document.getElementById("status");

const documentInfo = document.getElementById("documentInfo");

const infoType = document.getElementById("infoType");
const infoProtocol = document.getElementById("infoProtocol");
const infoService = document.getElementById("infoService");
const infoNrea = document.getElementById("infoNrea");


/*
|--------------------------------------------------------------------------
| CONFIGURAÇÃO
|--------------------------------------------------------------------------
*/

const API_URL =
    "https://SEU-PROJETO.supabase.co/functions/v1/get-document-data";


/*
|--------------------------------------------------------------------------
| MODELOS DISPONÍVEIS
|--------------------------------------------------------------------------
*/

const documentModels = {
    documento_criacao_empresa: {
        file: "modelos/criacao-empresa.docx",
        name: "Criação de Empresa",
        outputName: "documento-criacao-empresa.docx"
    }
};


/*
|--------------------------------------------------------------------------
| STATUS
|--------------------------------------------------------------------------
*/

function showStatus(message, type) {
    statusBox.textContent = message;
    statusBox.className = type;
}


/*
|--------------------------------------------------------------------------
| LEITURA DO JSON
|--------------------------------------------------------------------------
*/

function parsePackage() {
    const raw = jsonInput.value.trim();

    if (!raw) {
        throw new Error("Cole o pacote JSON do REA.");
    }

    try {
        return JSON.parse(raw);
    } catch {
        throw new Error("O conteúdo informado não é um JSON válido.");
    }
}


/*
|--------------------------------------------------------------------------
| VALIDAÇÃO BÁSICA
|--------------------------------------------------------------------------
*/

function validatePackage(pkg) {

    const required = [
        "doc_id",
        "protocol_id",
        "document_type",
        "protocol_number",
        "service_type",
        "content_data",
        "checksum"
    ];

    for (const field of required) {
        if (
            pkg[field] === undefined ||
            pkg[field] === null ||
            pkg[field] === ""
        ) {
            throw new Error(`Campo obrigatório ausente: ${field}`);
        }
    }

    if (
        typeof pkg.content_data !== "object" ||
        Array.isArray(pkg.content_data)
    ) {
        throw new Error("content_data inválido.");
    }

    if (!documentModels[pkg.document_type]) {
        throw new Error(
            `Modelo não encontrado: ${pkg.document_type}`
        );
    }
}


/*
|--------------------------------------------------------------------------
| FORMATAÇÃO
|--------------------------------------------------------------------------
*/

function formatDate(value) {

    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("pt-BR").format(date);
}


function formatCurrency(value) {

    if (value === null || value === undefined || value === "") {
        return "";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
        return value;
    }

    return `${number.toLocaleString("pt-BR")} AbinaDólares`;
}


/*
|--------------------------------------------------------------------------
| FUNDADORES
|--------------------------------------------------------------------------
*/

function formatFounders(founders) {

    if (!Array.isArray(founders) || founders.length === 0) {
        return "";
    }

    return founders
        .map(founder => founder.full_name || "")
        .filter(Boolean)
        .join("\n");
}


/*
|--------------------------------------------------------------------------
| PARTICIPAÇÃO SOCIETÁRIA
|--------------------------------------------------------------------------
*/

function formatParticipation(founders) {

    if (!Array.isArray(founders) || founders.length === 0) {
        return "";
    }

    return founders
        .map(founder => {

            const name = founder.full_name || "";
            const percentage = founder.ownership_percentage;

            if (percentage === undefined || percentage === null) {
                return name;
            }

            return `${name}: ${percentage}%`;
        })
        .filter(Boolean)
        .join("\n");
}


/*
|--------------------------------------------------------------------------
| CAMPOS DO MODELO DE CRIAÇÃO DE EMPRESA
|--------------------------------------------------------------------------
*/

function buildCompanyData(pkg) {

    const data = pkg.content_data || {};

    return {
        PEA_DO_ATO: pkg.protocol_number || "",
        SERVICO: pkg.service_type || "",

        /*
         * O pacote atual de criação de empresa
         * não possui funcionário responsável pelo protocolo.
         */
        FUNCIONARIO: "",

        DATA: formatDate(data.created_at),

        NREA: data.nrea || "",

        NOME_EMPRESA: data.business_name || "",

        NOME_FANTASIA: data.trade_name || "",

        ATIVIDADE_ECONOMICA:
            data.economic_activity || "",

        DATA_CRIACAO:
            formatDate(data.created_at),

        /*
         * CPF NÃO é utilizado no documento.
         */
        FUNDADORES:
            formatFounders(data.founders),

        /*
         * O pacote atual não fornece uma lista
         * independente de sócios.
         */
        SOCIOS: "",

        PARTICIPACAO:
            formatParticipation(data.founders),

        CAPITAL_INICIAL:
            formatCurrency(data.initial_capital),

        SITUACAO:
            data.situacao_cadastral
                ? String(data.situacao_cadastral)
                    .charAt(0)
                    .toUpperCase() +
                  String(data.situacao_cadastral).slice(1)
                : ""
    };
}


/*
|--------------------------------------------------------------------------
| CONFERÊNCIA NO REA
|--------------------------------------------------------------------------
*/

async function verifyWithREA(pkg) {

    /*
     * Enquanto a URL real não estiver configurada,
     * fazemos a geração local.
     *
     * Depois vamos colocar aqui:
     *
     * ?doc_id=...&checksum=...
     */

    if (API_URL.includes("SEU-PROJETO")) {
        return {
            valid: true,
            localOnly: true
        };
    }

    const url =
        `${API_URL}?doc_id=${encodeURIComponent(pkg.doc_id)}` +
        `&checksum=${encodeURIComponent(pkg.checksum)}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `O REA recusou a consulta. HTTP ${response.status}`
        );
    }

    const serverData = await response.json();

    if (!serverData.valid) {
        throw new Error(
            "O documento não foi validado pelo REA."
        );
    }

    if (serverData.doc_id !== pkg.doc_id) {
        throw new Error(
            "O documento retornado pelo REA não corresponde ao pacote."
        );
    }

    if (serverData.document_type !== pkg.document_type) {
        throw new Error(
            "O tipo de documento não corresponde."
        );
    }

    if (serverData.checksum &&
        serverData.checksum !== pkg.checksum) {

        throw new Error(
            "O checksum não corresponde ao documento."
        );
    }

    return serverData;
}


/*
|--------------------------------------------------------------------------
| DOWNLOAD
|--------------------------------------------------------------------------
*/

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


/*
|--------------------------------------------------------------------------
| GERAÇÃO DO DOCX
|--------------------------------------------------------------------------
*/

async function generateDocx(pkg) {
    const model = documentModels[pkg.document_type];

    if (!model) {
        throw new Error(
            "Não existe modelo para esse tipo de documento."
        );
    }

    console.log("Tentando carregar modelo:", model.file);

    let response;

    try {
        response = await fetch(model.file);
    } catch (error) {
        console.error("ERRO AO BUSCAR MODELO:", error);

        throw new Error(
            `Não foi possível acessar o modelo DOCX: ${model.file}`
        );
    }

    if (!response.ok) {
        throw new Error(
            `Modelo DOCX não encontrado. HTTP ${response.status}: ${model.file}`
        );
    }

    const arrayBuffer = await response.arrayBuffer();

    console.log("Modelo carregado:", arrayBuffer.byteLength, "bytes");

    let zip;

    try {
        zip = new PizZip(arrayBuffer);
    } catch (error) {
        console.error("ERRO NO PIZZIP:", error);

        throw new Error(
            "O arquivo encontrado não é um DOCX válido."
        );
    }

    const doc = new window.docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true
    });

    let fields;

    switch (pkg.document_type) {
        case "documento_criacao_empresa":
            fields = buildCompanyData(pkg);
            break;

        default:
            throw new Error(
                "Modelo ainda não implementado."
            );
    }

    console.log("Campos enviados para o modelo:", fields);

    try {
        doc.render(fields);
    } catch (error) {
        console.error("ERRO AO PREENCHER DOCX:", error);

        throw new Error(
            "Não foi possível preencher o modelo. " +
            "Verifique os marcadores {{...}} no DOCX."
        );
    }

    const blob = doc.getZip().generate({
        type: "blob",
        mimeType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });

    downloadBlob(
        blob,
        model.outputName
    );
}


/*
|--------------------------------------------------------------------------
| EXIBIÇÃO DAS INFORMAÇÕES
|--------------------------------------------------------------------------
*/

function showDocumentInfo(pkg) {

    const model =
        documentModels[pkg.document_type];

    infoType.textContent =
        model ? model.name : pkg.document_type;

    infoProtocol.textContent =
        pkg.protocol_number || "-";

    infoService.textContent =
        pkg.service_type || "-";

    infoNrea.textContent =
        pkg.content_data?.nrea || "-";

    documentInfo.classList.remove("hidden");
}


/*
|--------------------------------------------------------------------------
| BOTÃO PRINCIPAL
|--------------------------------------------------------------------------
*/

generateButton.addEventListener("click", async () => {

    generateButton.disabled = true;

    try {

        showStatus(
            "Lendo pacote...",
            "success"
        );

        const pkg =
            parsePackage();

        validatePackage(pkg);

        showDocumentInfo(pkg);

        showStatus(
            "Validando documento...",
            "success"
        );

        await verifyWithREA(pkg);

        showStatus(
            "Preenchendo modelo oficial...",
            "success"
        );

        await generateDocx(pkg);

        showStatus(
            "Documento gerado com sucesso! 📄",
            "success"
        );

    } catch (error) {

        console.error(error);

        showStatus(
            error.message ||
            "Erro desconhecido.",
            "error"
        );

    } finally {

        generateButton.disabled = false;
    }
});

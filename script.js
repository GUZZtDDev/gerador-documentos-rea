const jsonInput = document.getElementById("jsonInput");
const readButton = document.getElementById("readButton");

const message = document.getElementById("message");
const result = document.getElementById("result");

const translations = {

    nrea: "NREA",

    hired_at: "Data de Contratação",
    position: "Cargo",
    company_name: "Empresa",
    employee_name: "Funcionário",
    admission_date: "Data de Admissão",

    founders: "Fundadores",
    created_at: "Data de Criação",
    trade_name: "Nome Fantasia",
    business_name: "Razão Social",
    initial_capital: "Capital Inicial",
    economic_activity: "Atividade Econômica",
    situacao_cadastral: "Situação Cadastral"
};


function showMessage(text, type) {

    message.textContent = text;
    message.className = type;
}


function formatKey(key) {

    return translations[key] ||
        key
            .replaceAll("_", " ")
            .replace(/\b\w/g, letter => letter.toUpperCase());
}


function formatDate(value) {

    if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {

        const [year, month, day] = value.split("-");

        return `${day}/${month}/${year}`;
    }

    return value;
}


function createAdmissionDocument(data) {

    const content = data.content_data;

    return `
        <div class="document">

            <div class="document-header">

                <h3>REGISTRO EMPRESARIAL ABINADÓLAR</h3>

                <p>REA</p>

            </div>


            <div class="document-title">
                Termo de Admissão de Funcionário
            </div>


            <div class="document-info">

                <p>
                    <strong>NREA:</strong>
                    ${content.nrea || "-"}
                </p>

                <p>
                    <strong>Protocolo:</strong>
                    ${data.protocol_number || "-"}
                </p>

                <p>
                    <strong>Funcionário:</strong>
                    ${content.employee_name || "-"}
                </p>

                <p>
                    <strong>Cargo:</strong>
                    ${content.position || "-"}
                </p>

                <p>
                    <strong>Empresa:</strong>
                    ${content.company_name || "-"}
                </p>

                <p>
                    <strong>Data de Admissão:</strong>
                    ${formatDate(content.admission_date) || "-"}
                </p>

            </div>


            <p>
                Pelo presente documento, fica registrada a admissão
                do funcionário acima identificado, conforme os dados
                constantes no Registro Empresarial Abinadólar.
            </p>


            <div class="document-signature">

                <div class="signature-line"></div>

                <p>Responsável</p>

            </div>

        </div>
    `;
}


function createCompanyDocument(data) {

    const content = data.content_data;

    return `
        <div class="document">

            <div class="document-header">

                <h3>REGISTRO EMPRESARIAL ABINADÓLAR</h3>

                <p>REA</p>

            </div>


            <div class="document-title">
                Registro de Criação de Empresa
            </div>


            <div class="document-info">

                <p>
                    <strong>NREA:</strong>
                    ${content.nrea || "-"}
                </p>

                <p>
                    <strong>Protocolo:</strong>
                    ${data.protocol_number || "-"}
                </p>

                <p>
                    <strong>Razão Social:</strong>
                    ${content.business_name || "-"}
                </p>

                <p>
                    <strong>Nome Fantasia:</strong>
                    ${content.trade_name || "-"}
                </p>

                <p>
                    <strong>Atividade Econômica:</strong>
                    ${content.economic_activity || "-"}
                </p>

                <p>
                    <strong>Capital Inicial:</strong>
                    ${content.initial_capital || "-"}
                </p>

                <p>
                    <strong>Situação Cadastral:</strong>
                    ${content.situacao_cadastral || "-"}
                </p>

            </div>


            <div class="document-signature">

                <div class="signature-line"></div>

                <p>Responsável</p>

            </div>

        </div>
    `;
}


function generatePreview(data) {

    const preview =
        document.getElementById("documentPreview");

    switch (data.document_type) {

        case "documento_admissao_funcionario":

            preview.innerHTML =
                createAdmissionDocument(data);

            break;


        case "documento_criacao_empresa":

            preview.innerHTML =
                createCompanyDocument(data);

            break;


        default:

            preview.innerHTML = `
                <div class="document">

                    <h3>Modelo não disponível</h3>

                    <p>
                        O tipo de documento
                        <strong>${data.document_type}</strong>
                        ainda não possui um modelo configurado.
                    </p>

                </div>
            `;
    }
}


function readDocument() {

    const text = jsonInput.value.trim();

    result.classList.add("hidden");

    message.className = "";
    message.textContent = "";

    if (!text) {

        showMessage(
            "Cole o pacote JSON primeiro.",
            "error"
        );

        return;
    }


    let data;

    try {

        data = JSON.parse(text);

    } catch (error) {

        showMessage(
            "JSON inválido. Verifique o pacote copiado do REA.",
            "error"
        );

        return;
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


    const missingFields =
        requiredFields.filter(
            field => !(field in data)
        );


    if (missingFields.length > 0) {

        showMessage(
            "Pacote incompleto. Campos ausentes: " +
            missingFields.join(", "),
            "error"
        );

        return;
    }


    if (
        typeof data.content_data !== "object" ||
        data.content_data === null ||
        Array.isArray(data.content_data)
    ) {

        showMessage(
            "O campo content_data possui formato inválido.",
            "error"
        );

        return;
    }


    document.getElementById("docId").textContent =
        data.doc_id;

    document.getElementById("protocolNumber").textContent =
        data.protocol_number;

    document.getElementById("serviceType").textContent =
        data.service_type;

    document.getElementById("documentType").textContent =
        data.document_type;

    document.getElementById("protocolId").textContent =
        data.protocol_id;

    document.getElementById("checksum").textContent =
        data.checksum;


    generatePreview(data);


    result.classList.remove("hidden");


    showMessage(
        "Documento lido e modelo identificado com sucesso.",
        "success"
    );
}


readButton.addEventListener(
    "click",
    readDocument
);

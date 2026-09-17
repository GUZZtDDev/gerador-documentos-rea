const jsonInput = document.getElementById("jsonInput");
const readButton = document.getElementById("readButton");
const message = document.getElementById("message");
const result = document.getElementById("result");

function showMessage(text, type) {
    message.textContent = text;
    message.className = type;
}

function formatKey(key) {
    return key
        .replaceAll("_", " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

function formatValue(value) {
    if (value === null || value === undefined) {
        return "-";
    }

    if (typeof value === "object") {
        return JSON.stringify(value, null, 2);
    }

    return String(value);
}

function readDocument() {
    const text = jsonInput.value.trim();

    result.classList.add("hidden");
    message.className = "";
    message.textContent = "";

    if (!text) {
        showMessage("Cole o pacote JSON primeiro.", "error");
        return;
    }

    let data;

    try {
        data = JSON.parse(text);
    } catch (error) {
        showMessage(
            "JSON inválido. Verifique se o pacote foi copiado corretamente.",
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

    const missingFields = requiredFields.filter(
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
            "O campo content_data não possui um formato válido.",
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

    const contentContainer =
        document.getElementById("contentData");

    contentContainer.innerHTML = "";

    Object.entries(data.content_data).forEach(
        ([key, value]) => {

            const item = document.createElement("div");
            item.className = "data-item";

            const keyElement =
                document.createElement("div");

            keyElement.className = "data-key";
            keyElement.textContent = formatKey(key);

            const valueElement =
                document.createElement("div");

            valueElement.className = "data-value";
            valueElement.textContent = formatValue(value);

            item.appendChild(keyElement);
            item.appendChild(valueElement);

            contentContainer.appendChild(item);
        }
    );

    result.classList.remove("hidden");

    showMessage(
        "Pacote lido com sucesso.",
        "success"
    );
}

readButton.addEventListener("click", readDocument);

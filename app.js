// Producto 5 - Carga y muestra el XML como tablas HTML

const btnCargar = document.getElementById('btn-cargar');
const btnArchivo = document.getElementById('btn-archivo');
const inputArchivo = document.getElementById('input-archivo');
const mensaje = document.getElementById('mensaje-estado');
const resultado = document.getElementById('resultado');

// Boton principal: carga red.xml desde el servidor
btnCargar.addEventListener('click', async function () {
    try {
        const respuesta = await fetch('red.xml');
        if (!respuesta.ok) {
            throw new Error('No se ha podido leer red.xml');
        }
        const texto = await respuesta.text();
        mostrar(texto, 'red.xml');
    } catch (err) {
        ponerMensaje('Error al cargar red.xml: ' + err.message, 'error');
    }
});

// Boton secundario: abre el selector de archivos del navegador
btnArchivo.addEventListener('click', function () {
    inputArchivo.click();
});

inputArchivo.addEventListener('change', function (e) {
    const archivo = e.target.files[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = function () {
        mostrar(lector.result, archivo.name);
    };
    lector.readAsText(archivo);
});

// Parsea el XML y construye las tablas
function mostrar(textoXml, origen) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(textoXml, 'application/xml');

    // DOMParser no lanza error: inserta <parsererror> si el XML es invalido
    if (doc.querySelector('parsererror')) {
        ponerMensaje('El XML no esta bien formado', 'error');
        return;
    }

    const adaptador = doc.querySelector('adaptador');
    const nombre = adaptador.getAttribute('nombre');
    const ip = adaptador.querySelector('ip').textContent;
    const mascara = adaptador.querySelector('mascara').textContent;
    const puerta = adaptador.querySelector('puerta_enlace').textContent;
    const dns = adaptador.querySelector('dns_primario').textContent;
    const velocidadEl = adaptador.querySelector('velocidad_dns');
    const velocidad = velocidadEl.textContent + ' ' + velocidadEl.getAttribute('unidad');

    const trazado = adaptador.querySelector('trazado');
    const totalSaltos = trazado.getAttribute('saltos_totales');
    const saltos = trazado.querySelectorAll('salto');

    let filasSaltos = '';
    for (let i = 0; i < saltos.length; i++) {
        const num = saltos[i].getAttribute('numero');
        const ipSalto = saltos[i].textContent;
        filasSaltos += '<tr><td>' + num + '</td><td>' + ipSalto + '</td></tr>';
    }

    resultado.innerHTML = `
        <h2>Configuracion del adaptador <em>${nombre}</em></h2>

        <h3>Datos de red</h3>
        <table>
            <thead>
                <tr><th>Campo</th><th>Valor</th></tr>
            </thead>
            <tbody>
                <tr><td><strong>Direccion IP</strong></td><td>${ip}</td></tr>
                <tr><td><strong>Mascara de subred</strong></td><td>${mascara}</td></tr>
                <tr><td><strong>Puerta de enlace</strong></td><td>${puerta}</td></tr>
                <tr><td><strong>DNS primario</strong></td><td>${dns}</td></tr>
                <tr><td><strong>Velocidad media DNS</strong></td><td>${velocidad}</td></tr>
            </tbody>
        </table>

        <h3>Trazado hasta el DNS (${totalSaltos} saltos)</h3>
        <table>
            <thead>
                <tr><th>Salto</th><th>Direccion IP</th></tr>
            </thead>
            <tbody>${filasSaltos}</tbody>
        </table>
    `;

    resultado.classList.remove('oculto');
    ponerMensaje('Configuracion cargada desde "' + origen + '"', 'ok');
}

function ponerMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = 'estado ' + tipo;
}

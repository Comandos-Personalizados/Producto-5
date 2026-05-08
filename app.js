/* =============================================================
   Producto 5 - Lógica de carga y renderizado del XML
   -------------------------------------------------------------
   Al pulsar "Cargar configuración del adaptador" se intenta leer
   el archivo red.xml mediante fetch(). Si la página se abre con
   el protocolo file:// el navegador bloqueará fetch por CORS, en
   ese caso se ofrece automáticamente seleccionar el archivo a
   mano con un input[type=file]. En ambos casos el XML se parsea
   con DOMParser y se inyecta como tablas HTML formateadas con
   estilos.css.
   ============================================================= */

(function () {
    'use strict';

    const RUTA_XML_POR_DEFECTO = 'red.xml';

    const btnCargar = document.getElementById('btn-cargar');
    const btnArchivo = document.getElementById('btn-archivo');
    const inputArchivo = document.getElementById('input-archivo');
    const mensajeEstado = document.getElementById('mensaje-estado');
    const seccionResultado = document.getElementById('resultado');

    btnCargar.addEventListener('click', cargarDesdeFetch);
    btnArchivo.addEventListener('click', () => inputArchivo.click());
    inputArchivo.addEventListener('change', cargarDesdeArchivo);

    /**
     * Intenta cargar red.xml desde el mismo directorio mediante fetch.
     * Si falla (típicamente porque la página se ha abierto como file://)
     * ofrece automáticamente el selector de archivos como alternativa.
     */
    async function cargarDesdeFetch() {
        ponerEstado('Cargando red.xml...', '');

        try {
            const respuesta = await fetch(RUTA_XML_POR_DEFECTO, { cache: 'no-store' });
            if (!respuesta.ok) {
                throw new Error('HTTP ' + respuesta.status);
            }
            const texto = await respuesta.text();
            procesarXml(texto, RUTA_XML_POR_DEFECTO);
        } catch (err) {
            // file:// y 404 caen aquí. Activamos el selector de archivos.
            ponerEstado(
                'No se ha podido cargar red.xml automáticamente. ' +
                'Selecciona el archivo manualmente...',
                'error'
            );
            inputArchivo.click();
        }
    }

    /**
     * Lee el archivo seleccionado por el usuario con FileReader y lo procesa.
     */
    function cargarDesdeArchivo(evento) {
        const archivo = evento.target.files && evento.target.files[0];
        if (!archivo) {
            return;
        }

        const lector = new FileReader();
        lector.onload = function (e) {
            procesarXml(e.target.result, archivo.name);
        };
        lector.onerror = function () {
            ponerEstado('Error leyendo el archivo seleccionado.', 'error');
        };
        lector.readAsText(archivo, 'utf-8');

        // Permite volver a seleccionar el mismo archivo si el usuario lo desea.
        evento.target.value = '';
    }

    /**
     * Parsea la cadena XML, valida que esté bien formada y delega el
     * pintado a renderizar(). Muestra mensajes de error claros si algo falla.
     */
    function procesarXml(textoXml, origen) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(textoXml, 'application/xml');

            // DOMParser no lanza excepción ante XML mal formado: inserta
            // un nodo <parsererror>. Hay que comprobarlo explícitamente.
            const errorNodo = doc.querySelector('parsererror');
            if (errorNodo) {
                throw new Error('XML mal formado: ' + (errorNodo.textContent || '').trim());
            }

            const adaptador = doc.querySelector('red > adaptador');
            if (!adaptador) {
                throw new Error('No se encuentra el elemento <adaptador> dentro de <red>.');
            }

            renderizar(adaptador);
            ponerEstado('Configuración cargada desde "' + origen + '".', 'ok');
        } catch (err) {
            seccionResultado.classList.add('oculto');
            seccionResultado.innerHTML = '';
            ponerEstado('No se ha podido procesar el XML: ' + err.message, 'error');
        }
    }

    /**
     * Construye e inyecta el HTML formateado a partir del nodo <adaptador>.
     * El resultado son dos tablas: datos del adaptador y trazado por saltos.
     */
    function renderizar(adaptador) {
        const nombre = adaptador.getAttribute('nombre') || '(sin nombre)';
        const ip = textoDe(adaptador, 'ip');
        const mascara = textoDe(adaptador, 'mascara');
        const puerta = textoDe(adaptador, 'puerta_enlace');
        const dns = textoDe(adaptador, 'dns_primario');

        const velocidadEl = adaptador.querySelector(':scope > velocidad_dns');
        const velocidad = velocidadEl ? (velocidadEl.textContent || '').trim() : '';
        const unidad = velocidadEl ? (velocidadEl.getAttribute('unidad') || '') : '';

        const trazadoEl = adaptador.querySelector(':scope > trazado');
        const totalSaltos = trazadoEl ? (trazadoEl.getAttribute('saltos_totales') || '0') : '0';
        const saltos = trazadoEl ? Array.from(trazadoEl.querySelectorAll(':scope > salto')) : [];

        const html = `
            <h2>Configuración del adaptador</h2>
            <span class="nombre-adaptador">${escapar(nombre)}</span>

            <h3>Datos de red</h3>
            <table>
                <caption>Información IP del adaptador</caption>
                <thead>
                    <tr><th scope="col">Campo</th><th scope="col">Valor</th></tr>
                </thead>
                <tbody>
                    <tr><th scope="row">Dirección IP</th><td>${escapar(ip) || '<em>N/D</em>'}</td></tr>
                    <tr><th scope="row">Máscara de subred</th><td>${escapar(mascara) || '<em>N/D</em>'}</td></tr>
                    <tr><th scope="row">Puerta de enlace</th><td>${escapar(puerta) || '<em>N/D</em>'}</td></tr>
                    <tr><th scope="row">DNS primario</th><td>${escapar(dns) || '<em>N/D</em>'}</td></tr>
                    <tr><th scope="row">Velocidad media DNS</th><td>${formatearVelocidad(velocidad, unidad)}</td></tr>
                </tbody>
            </table>

            <h3>Trazado de ruta hasta el DNS <span class="badge-saltos">${escapar(totalSaltos)} saltos</span></h3>
            ${construirTablaTrazado(saltos)}
        `;

        seccionResultado.innerHTML = html;
        seccionResultado.classList.remove('oculto');
    }

    /**
     * Construye la tabla de trazado. Si no hay saltos devuelve un mensaje.
     */
    function construirTablaTrazado(saltos) {
        if (!saltos.length) {
            return '<p><em>No se han registrado saltos en el trazado.</em></p>';
        }

        const filas = saltos.map(function (salto) {
            const numero = escapar(salto.getAttribute('numero') || '');
            const ip = escapar((salto.textContent || '').trim() || '*');
            return '<tr><td>' + numero + '</td><td>' + ip + '</td></tr>';
        }).join('');

        return `
            <table class="tabla-trazado">
                <caption>Saltos detectados por tracert</caption>
                <thead>
                    <tr><th scope="col">Salto</th><th scope="col">Dirección IP</th></tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        `;
    }

    function formatearVelocidad(valor, unidad) {
        if (!valor) {
            return '<em>N/D</em>';
        }
        const u = unidad ? ' ' + escapar(unidad) : '';
        return escapar(valor) + u;
    }

    /**
     * Devuelve el texto del primer hijo directo con la etiqueta dada.
     * Usar :scope evita capturar nodos descendientes en estructuras anidadas.
     */
    function textoDe(elemento, etiqueta) {
        const nodo = elemento.querySelector(':scope > ' + etiqueta);
        return nodo ? (nodo.textContent || '').trim() : '';
    }

    /**
     * Escapa caracteres HTML para evitar inyección al volcar texto del XML.
     */
    function escapar(texto) {
        if (texto == null) return '';
        return String(texto)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function ponerEstado(texto, tipo) {
        mensajeEstado.textContent = texto;
        mensajeEstado.classList.remove('ok', 'error');
        if (tipo) {
            mensajeEstado.classList.add(tipo);
        }
    }
})();

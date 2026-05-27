# 🚀 Guía de Despliegue Automático en Hostinger desde GitHub

Hostinger te dice que "no es compatible" directamente porque su pestaña de **Git** integrada solo descarga (*git pull*) tu código fuente tal cual (los archivos `.tsx`, `package.json`, etc.). Sin embargo, los servidores web compartidos no saben qué hacer con archivos `.tsx` sin compilar, ya que las webs funcionan con HTML, CSS y JavaScript tradicional compilado.

Para solucionar esto de manera **100% automatizada, profesional y gratuita**, acabo de crear un archivo de integración continua (**GitHub Actions**) en tu proyecto. 

A partir de ahora, cada vez que hagas un `git push` a tu repositorio de GitHub, un servidor de GitHub **compilará automáticamente tu proyecto de React** y **subirá solo el resultado compilado (`dist`) a tu Hostinger por FTP en segundos**. ¡No tenés que compilar nada a mano!

---

## 🛠️ Paso 1: Obtener las credenciales FTP de Hostinger

1. Entrá a tu panel de control **hPanel de Hostinger**.
2. Ve a **Sitios Web** ➡️ Seleccioná tu sitio ➡️ Buscá la sección **Cuentas FTP** (está en la barra lateral o buscando "FTP").
3. Copiá los siguientes datos:
   - **Servidor FTP (Host)**: (Suele ser `ftp.tudominio.com` o una IP).
   - **Usuario FTP**: (Suele ser algo como `u123456789@tudominio.com`).
   - **Contraseña FTP**: (Si no la sabés, podés restablecerla o crear una nueva para mayor seguridad).

---

## 🔑 Paso 2: Configurar las Variables y Secretos en tu GitHub

Para que GitHub pueda compilar e ingresar a tu Hostinger de forma segura sin revelar tus contraseñas en el código, configuraremos los **Repository Secrets**:

1. Entrá a tu repositorio en **GitHub**.
2. Ve a la pestaña **Settings** (Configuración) en el menú superior del repositorio.
3. En la barra lateral izquierda, navegá a **Secrets and variables** ➡️ **Actions**.
4. Hacé clic en el botón verde **New repository secret** (Nuevo secreto del repositorio) y creá los siguientes 5 secretos:

| Nombre del Secreto (Name) | Valor (Value) | Ejemplo / Descripción |
| :--- | :--- | :--- |
| **`FTP_SERVER`** | Tu servidor FTP de Hostinger | `ftp.tudominio.com` |
| **`FTP_USERNAME`** | Tu usuario FTP de Hostinger | `u123456_admin` |
| **`FTP_PASSWORD`** | Tu contraseña FTP de Hostinger | `TuContraseñaSegura123` |
| **`VITE_SUPABASE_URL`** | Tu URL del proyecto de Supabase | `https://tu-proyecto.supabase.co` |
| **`VITE_SUPABASE_ANON_KEY`** | Tu clave anónima pública de Supabase | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

> *Nota: Asegúrate de guardar los nombres exactamente en mayúsculas como se detalla arriba para que la automatización los reconozca.*

---

## ⚡ Paso 3: ¡Hacer Push y Disfrutar de la Magia!

¡Eso es todo! Ahora la automatización está configurada:

1. Subí tu código a tu rama **`main`** en GitHub.
2. Ve a la pestaña **Actions** en tu repositorio de GitHub.
3. Verás una tarea en ejecución llamada **Deploy to Hostinger via FTP** con el estado `In Progress` 🟡.
4. En unos 1 o 2 minutos, cambiará a color verde `Success` 🟢 de forma totalmente automática.
5. **¡Listo!** Entrá a tu sitio web y verás tu app de rifas de rugby cargada, de forma rápida, segura y siempre sincronizada.

---

## 📂 ¿Qué hace exactamente este sistema en segundo plano?

- **Descarga el código**: GitHub inicia un contenedor virtual seguro para procesar tu web.
- **Configura Node.js**: Activa la versión recomendada para Vite.
- **Instala y Compila**: Descarga los paquetes del sitio, inyecta tus variables de Supabase de manera secreta, y genera el código nativo de alto rendimiento en la carpeta `/dist`.
- **Genera Rutas Seguras (`.htaccess`)**: Crea un archivo para que las rutas y navegación interna de React se recarguen perfectamente sin dar error 404 en Hostinger (Apache).
- **Sube los archivos**: Transfiere todo el sitio web compilado en un instante hacia tu Hostinger por FTP, dejándolo activo de inmediato.

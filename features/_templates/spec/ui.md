# <Nombre de la feature> — UI

Capacidades que debe tener la interfaz en Discord (slash commands, opciones y respuestas), sin formato concreto. Reglas de negocio en `product.md`; aquí se referencian, no se repiten.

Las capacidades (qué recibe, qué responde, estados) son obligatorias. La forma (texto plano, embed, botones, efímero o no) es una propuesta: si se resuelve distinto, se actualiza este archivo para reflejar lo construido.

## Comandos nuevos

### /<comando>

- **Opciones:** nombre, tipo y si es obligatoria, con un ejemplo realista.
- **Responde:** qué ve el usuario cuando sale bien, con un ejemplo.
- **Efecto:** qué pasa en el canal de voz o en la cola.
- **Referencia:** qué comando existente se parece, cuando aplica.
- **Estados:** errores y avisos visibles (sin canal de voz, cola vacía, no encontrado), y cuáles son efímeros.

## Cambios a comandos existentes

### /<comando>

- **Hoy:** qué hace.
- **Cambia:** qué se agrega, quita o se comporta distinto.

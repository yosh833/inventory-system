# Sistema de Inventario, Ventas y Compras

Sistema POS/ERP completo con control de inventario, punto de venta, compras, clientes, reportes y **comandos de voz**.

## 🚀 Características

- **Autenticación JWT + RBAC** (Admin / Operador / Cliente)
- **Punto de Venta (POS)** con carrito, pagos mixtos, cliente, **comandos de voz**
- **Inventario** con stock tiempo real, categorías, ajustes, códigos de barra
- **Compras** con órdenes, recepción parcial/total, costo promedio ponderado
- **Clientes** con límite crédito, saldo, pagos a cuenta
- **Reportes** con gráficos (Recharts): ventas, compras, top productos, stock crítico, flujo caja
- **Admin** usuarios, configuración sistema
- **Base de datos en memoria** (sin PostgreSQL requerido para desarrollo)

## 📦 Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| State | Zustand + TanStack Query |
| UI | Radix UI patterns + Lucide Icons |
| Backend | Node.js + Fastify + TypeScript |
| Auth | JWT (jose) + bcryptjs |
| DB | In-memory Map (dev) / Prisma + PostgreSQL (prod) |
| Voice | Web Speech API (STT) + NLP local (regex) |
| Charts | Recharts |
| Deploy | Docker Compose + Nginx |

## 🛠 Instalación Rápida

### Opción 1: Desarrollo Local (Recomendado)

```bash
# 1. Clonar y entrar
cd inventory-system

# 2. Backend
cd backend
npm install
npm run dev
# Corre en http://localhost:3001

# 3. Frontend (nueva terminal)
cd ../frontend
npm install
npm run dev
# Corre en http://localhost:5173
```

### Opción 2: Docker Compose

```bash
cd inventory-system
cp .env.example .env
# Edita .env con tus secrets

docker-compose up -d --build
# Backend: http://localhost:3001
# Frontend: http://localhost:5173
```

## 🔑 Credenciales de Prueba

| Usuario | Email | Contraseña | Rol |
|---------|-------|------------|-----|
| Admin | admin@demo.com | admin123 | ADMIN |
| Operador | operador@demo.com | operator123 | OPERATOR |

## 🎤 Comandos de Voz (POS)

Presiona el botón **🎤 Voz** en el POS y di:

```
"vender 3 tornillos M8 a cliente Juan Pérez"
"venta de 5 martillos a María a 150 pesos"
"comprar 50 varillas 3/8 al proveedor Aceros del Norte"
"cuánto hay de pintura blanca"
"reporte de ventas de hoy"
"productos más vendidos esta semana"
"stock crítico"
```

El sistema:
1. Convierte voz a texto (Web Speech API)
2. Extrae intención y entidades (NLP local)
3. Muestra confirmación visual
4. Ejecuta al confirmar

## 📁 Estructura del Proyecto

```
inventory-system/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Entry point
│   │   ├── memory/               # In-memory DB + seed
│   │   ├── types/                # TypeScript interfaces
│   │   ├── utils/                # JWT, errors, validation
│   │   ├── middleware/           # Auth, RBAC
│   │   ├── services/             # Business logic
│   │   └── routes/               # API endpoints
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/           # UI components
│   │   ├── pages/                # Page components
│   │   ├── hooks/                # Custom hooks
│   │   ├── store/                # Zustand stores
│   │   ├── api/                  # Axios client
│   │   ├── types/                # Shared types
│   │   └── utils/                # Formatters
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── docker-compose.yml
├── nginx.conf
└── .env.example
```

## 📚 API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro (primer admin)
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Perfil actual
- `GET /api/auth/users` - Listar usuarios (Admin)
- `POST /api/auth/users` - Crear usuario (Admin)

### Productos
- `GET /api/products` - Listar con filtros
- `POST /api/products` - Crear (Admin)
- `PUT /api/products/:id` - Actualizar (Admin)
- `POST /api/products/:id/adjust` - Ajustar stock

### Ventas
- `GET /api/sales` - Listar ventas
- `POST /api/sales` - Crear venta
- `POST /api/sales/:id/cancel` - Cancelar

### Compras
- `GET /api/purchases` - Listar órdenes
- `POST /api/purchases` - Crear orden
- `POST /api/purchases/:id/receive` - Recibir mercancía

### Clientes
- `GET /api/clients` - Listar
- `POST /api/clients` - Crear (Admin)
- `POST /api/clients/:id/payment` - Registrar pago

### Voz
- `POST /api/voice/command` - Procesar comando
- `POST /api/voice/text` - Parsear texto
- `GET /api/voice/help` - Ayuda comandos

### Reportes
- `GET /api/reports/dashboard` - KPIs
- `GET /api/reports/sales` - Ventas
- `GET /api/reports/purchases` - Compras
- `GET /api/reports/top-products` - Top productos
- `GET /api/reports/low-stock` - Stock crítico
- `GET /api/reports/cash-flow` - Flujo caja

## 🔧 Desarrollo

### Scripts Backend
```bash
npm run dev      # Desarrollo con hot reload (tsx)
npm run build    # Compilar TypeScript
npm run start    # Producción
```

### Scripts Frontend
```bash
npm run dev      # Vite dev server
npm run build    # Build producción
npm run preview  # Preview build
```

### Variables de Entorno

Crea `.env` en la raíz:
```env
JWT_SECRET=tu-secret-super-seguro
COOKIE_SECRET=otro-secret
FRONTEND_URL=http://localhost:5173
```

## 🐳 Producción con Docker

```bash
# 1. Configurar secrets
cp .env.example .env
# Edita .env con valores seguros

# 2. Construir y levantar
docker-compose -f docker-compose.yml up -d --build

# 3. Ver logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### SSL con Let's Encrypt (Opcional)
```bash
# Certificados en ./ssl/
# nginx.conf ya configurado para HTTPS
docker-compose --profile production up -d
```

## 🧪 Testing

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

## 📝 Licencia

MIT License - Úsalo libremente para proyectos comerciales o personales.

## 🤝 Contribuir

1. Fork el repo
2. Crea tu feature branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Add nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

**¿Problemas?** Revisa que el backend esté en `http://localhost:3001/health` y el frontend proxy apunte a `/api` → `localhost:3001`.
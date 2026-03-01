# Panchsugandh CRM

A mobile-first field operations CRM for dhoop and natural product sales.

## Stack

- **Database**: MySQL (Hostinger)
- **Backend**: Node.js + Express
- **Frontend**: React + Tailwind CSS (Vite, Mobile-First)

## Project Structure

```
panchsugandh-crm/
├── database/schema.sql     # Run this on Hostinger MySQL first
├── backend/                # Express API server
│   ├── server.js
│   ├── db.js
│   ├── .env.example        # Copy to .env and fill in credentials
│   ├── middleware/         # auth.js (JWT), rbac.js (roles)
│   └── routes/             # auth, users, orders, payments, delivery, ...
└── frontend/               # React + Tailwind (Vite)
    └── src/
        ├── pages/
        │   ├── Login.jsx
        │   ├── Dashboard.jsx         # Role-aware stats
        │   ├── salesperson/          # NewOrder, OrdersList, PaymentEntry
        │   ├── billoperator/         # BillingQueue
        │   └── delivery/             # DeliveryQueue (mandatory remark)
        └── components/               # BottomNav, ProtectedRoute
```

## Roles & Access

| Role | Access |
|---|---|
| Super Admin / Admin | Full system access, user management |
| Sales Officer | Manages their assigned Salesperson team |
| Salesperson | Order entry, payment collection, visit scheduling |
| Bill Operator | View & bill pending orders, edit quantities |
| Delivery In-charge | Mark deliveries complete (remark mandatory) |
| Store In-charge | Retailer/party master, areas, product inventory |

## Setup Instructions

### 1. Database
```bash
# Import schema into Hostinger MySQL
mysql -h <HOST> -u <USER> -p panchsugandh_crm < database/schema.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env          # Fill in DB credentials and JWT_SECRET
npm install
npm run dev                   # Starts on http://localhost:3001
```

### 3. Frontend
```bash
cd frontend
# Create .env.local
echo "VITE_API_URL=http://localhost:3001/api" > .env.local
npm install
npm run dev                   # Starts on http://localhost:5173
```

### Default Login
- Email: `superadmin@panchsugandh.com`
- Password: Contact your admin (stored as bcrypt hash in schema.sql)

> **Note**: Change the super admin password after first login via the admin panel.

## Key Business Rules

1. **Order Flow**: PENDING → BILLED → DELIVERED
2. **Delivery Remark**: Mandatory when marking delivery complete. The API returns HTTP 400 if omitted.
3. **Salesperson Isolation**: Sales Officers only see data for their assigned Salespersons (via `manager_id`).
4. **Payment Modes**: CASH, CHEQUE, UPI, NEFT, CREDIT

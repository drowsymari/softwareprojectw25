# GIU FoodTruck Backend – Milestone 3  
**Course:** Software Engineering  
**Semester:** Winter 2025  
**Instructor:** Dr. Iman Awad  

## Team Information  
**Team Name:** Software Project W25  
**Members:**  
- **Mariam Amr – 13005784**  
- **Kerolos Mishel – 14004113**  
- **Ali Ayman – 14002925**
- **Ali Refaie – 14001915**
- **Ali Mohamed – 14002564**
- **Mostafa Adel – 13004672**

---

# 1. Project Overview  
This backend implements the **FoodTruck Ordering System** required for **Milestone 3** of the GIU Software Engineering course.  
It follows the **university template folder structure** and implements **all 20 required endpoints**, including:

- Authentication  
- Session management  
- Menu item CRUD  
- Truck management  
- Cart operations  
- Order management  
- Truck owner–specific functionality  
- Customer–specific functionality  

This backend uses:

- **Node.js + Express**  
- **Knex.js** as the query builder  
- **PostgreSQL** (schema: `FoodTruck`)  
- **bcrypt** for password hashing  
- **JWT-less session token system**, stored in DB  
- **Authorization middleware** matching milestone requirements  

---

# 2. Folder Structure (University Template)

```
milestoneBackend/
│ server.js
│ package.json
│ .env
│ README.md
│
├── connectors/
│   ├── db.js
│   ├── scripts.sql
│   └── seed.sql
│
├── middleware/
│   └── auth.js
│
├── utils/
│   └── session.js
│
├── routes/
│   ├── public/
│   │   ├── api.js        <-- PUBLIC endpoints
│   │   └── view.js
│   ├── private/
│   │   ├── api.js        <-- PRIVATE (auth required) endpoints
│   │   └── view.js
│   └── auth.js           <-- Login / Signup
│
├── public/
│   ├── images/
│   ├── js/
│   └── styles/
│
└── views/
    ├── login.hjs
    ├── register.hjs
    ├── customerHomepage.hjs
    └── truckOwnerHomePage.hjs
```

---

# 3. Environment Configuration (.env)

```
PG_HOST=127.0.0.1
PG_PORT=2025
PG_USER=postgres
PG_PASSWORD=1234
PG_DATABASE=giu_foodtruck
SCHEMA=FoodTruck

PORT=3000
NODE_ENV=development
TOKEN_EXPIRY_HOURS=24
```

---

# 4. Database Setup

### 4.1 Create Database
In pgAdmin or psql:

```sql
CREATE DATABASE giu_foodtruck;
```

### 4.2 Run Schema
Inside pgAdmin Query Tool, paste the full `scripts.sql`.

### 4.3 (Optional) Seed Data
After schema:

```bash
psql -U postgres -p 2025 -d giu_foodtruck -f connectors/seed.sql
```

---

# 5. Running the Server

### Install dependencies:
```
npm install
```

### Start the backend:
```
node server.js
```

API root:  
`http://localhost:3000/api/v1`

---

# 6. Authentication Model

Sessions follow milestone specs:

- Login returns a **token** stored in DB table `FoodTruck.Sessions`
- All private endpoints require header:
```
Authorization: Bearer <token>
```
- Session resolves to user+truckOwner relation  
- `getUser()` returns the full user object including truckId

---

# 7. Endpoints Summary (All 20 Required Endpoints)

### AUTH (2)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/signup | Register customer/owner |
| POST | /api/v1/auth/login | Login + return token |

---

### TRUCKS (3)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/trucks/view | View all available trucks |
| GET | /api/v1/trucks/myTruck | Owner views their truck |
| PUT | /api/v1/trucks/updateOrderStatus | Owner updates truck orderStatus |

---

### MENU ITEMS (5)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/menuItem/new | Owner creates menu item |
| GET | /api/v1/menuItem/view | Owner views all menu items |
| GET | /api/v1/menuItem/view/:id | View one item |
| PUT | /api/v1/menuItem/edit/:id | Edit menu item |
| DELETE | /api/v1/menuItem/delete/:id | Mark menu item unavailable |

---

### PUBLIC MENU BROWSING (2)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/menuItem/truck/:truckId | Public view of truck menu |
| GET | /api/v1/menuItem/truck/:truckId/category/:cat | Filter by category |

---

### CART (4)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/cart/new | Add item to cart |
| GET | /api/v1/cart/view | View my cart |
| PUT | /api/v1/cart/edit/:cartId | Edit item quantity |
| DELETE | /api/v1/cart/delete/:cartId | Remove item |

---

### ORDERS (4)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/order/new | Place order |
| GET | /api/v1/order/myOrders | Customer views their orders |
| GET | /api/v1/order/details/:orderId | Customer views details |
| GET | /api/v1/order/truckOrders | Owner views orders for their truck |

---

### ORDER OWNER ACTION (2)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/order/truckOwner/:orderId | Owner views order details |
| PUT | /api/v1/order/updateStatus/:orderId | Owner updates order status |

---

# 8. Postman Collection

A complete JSON file is included in the repository under:

```
postman/FoodTruck.postman_collection.json
```

You can import it directly into Postman.

---

# 9. Submission Checklist
✔ README.md  
✔ scripts.sql  
✔ seed.sql  
✔ 20 endpoints implemented  
✔ All files inside university template  
✔ Postman collection  
✔ Runs on PostgreSQL port 2025  
✔ Password hashing using bcrypt  
✔ Session token system  
✔ No JWT used (matches milestone)  

---

# 10. Notes
- Only truck owners can access truck/menu/order owner endpoints  
- Customers cannot modify trucks or menu  
- Session tokens expire but can be extended easily  
- Errors follow milestone output formats  

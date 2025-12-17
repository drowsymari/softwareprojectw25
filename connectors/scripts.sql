-- ===========================================
-- SCHEMA CREATION
-- ===========================================
CREATE SCHEMA IF NOT EXISTS FoodTruck;

-- ===========================================
-- USERS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS FoodTruck.Users (
    userid SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'customer',  -- customer | truckOwner
    birthdate DATE DEFAULT CURRENT_DATE,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- TRUCKS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS FoodTruck.Trucks (
    truckid SERIAL PRIMARY KEY,
    truckname TEXT NOT NULL UNIQUE,
    trucklogo TEXT,
    ownerid INTEGER REFERENCES FoodTruck.Users(userid),
    truckstatus TEXT DEFAULT 'available',
    orderstatus TEXT DEFAULT 'available',
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- MENU ITEMS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS FoodTruck.MenuItems (
    itemid SERIAL PRIMARY KEY,
    truckid INTEGER REFERENCES FoodTruck.Trucks(truckid),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    category TEXT NOT NULL,
    status TEXT DEFAULT 'available',
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- CART TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS FoodTruck.Carts (
    cartid SERIAL PRIMARY KEY,
    userid INTEGER REFERENCES FoodTruck.Users(userid),
    itemid INTEGER REFERENCES FoodTruck.MenuItems(itemid),
    quantity INTEGER NOT NULL,
    price NUMERIC(10,2) NOT NULL
);

-- ===========================================
-- ORDERS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS FoodTruck.Orders (
    orderid SERIAL PRIMARY KEY,
    userid INTEGER REFERENCES FoodTruck.Users(userid),
    truckid INTEGER REFERENCES FoodTruck.Trucks(truckid),
    orderstatus TEXT NOT NULL, -- New, Preparing, Ready, Completed, Cancelled
    totalprice NUMERIC(10,2) NOT NULL,
    scheduledpickuptime TIMESTAMP,
    estimatedearliestpickup TIMESTAMP,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- ORDER ITEMS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS FoodTruck.OrderItems (
    orderitemid SERIAL PRIMARY KEY,
    orderid INTEGER REFERENCES FoodTruck.Orders(orderid),
    itemid INTEGER REFERENCES FoodTruck.MenuItems(itemid),
    quantity INTEGER NOT NULL,
    price NUMERIC(10,2) NOT NULL  -- ✅ CORRECT (matches spec)
);

-- ===========================================
-- SESSIONS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS FoodTruck.Sessions (
    id SERIAL PRIMARY KEY,
    userid INTEGER REFERENCES FoodTruck.Users(userid),
    token TEXT NOT NULL UNIQUE,
    expiresat TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 day')
);

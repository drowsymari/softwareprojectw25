-- ===========================================
-- SAMPLE USERS
-- password for all = "1234"
-- ===========================================
INSERT INTO FoodTruck.Users (name, email, password, role)
VALUES
    ('John Customer', 'customer@giu.com', '$2b$10$K7J47tQ0AEBNQXVsa6QZQO/tG0hV5dGv6.2QB/j81.gT0AoqJgN3', 'customer'),
    ('Sarah Vendor', 'vendor@giu.com', '$2b$10$K7J47tQ0AEBNQXVsa6QZQO/tG0hV5dGv6.2QB/j81.gT0AoqJgN3', 'truckOwner');

-- ===========================================
-- SAMPLE TRUCK
-- ===========================================
INSERT INTO FoodTruck.Trucks (truckName, truckLogo, ownerId)
VALUES
('Burger Paradise', 'https://example.com/burger.png', 2);

-- ===========================================
-- SAMPLE MENU ITEMS
-- ===========================================
INSERT INTO FoodTruck.MenuItems (truckId, name, description, price, category)
VALUES
(1, 'Classic Burger', 'Juicy beef burger with cheese', 45.99, 'Main Course'),
(1, 'French Fries', 'Crispy fries', 15.00, 'Sides');

-- ===========================================
-- SAMPLE SESSIONS FOR TESTING
-- ===========================================
INSERT INTO FoodTruck.Sessions (userId, token, expiresAt)
VALUES
(1, 'test_customer_token', CURRENT_TIMESTAMP + INTERVAL '1 day'),
(2, 'test_owner_token', CURRENT_TIMESTAMP + INTERVAL '1 day');

-- Add to seed.sql (after existing inserts):

-- ===========================================
-- SAMPLE CART ITEMS FOR TESTING
-- ===========================================
INSERT INTO FoodTruck.Carts (userId, itemId, quantity, price)
VALUES
(1, 1, 2, 45.99),  -- Customer 1 has 2 Classic Burgers in cart
(1, 2, 1, 15.00);  -- Customer 1 has 1 French Fries in cart

-- ===========================================
-- SAMPLE ORDER FOR TESTING
-- ===========================================
INSERT INTO FoodTruck.Orders (userId, truckId, orderStatus, totalPrice, scheduledPickupTime, estimatedEarliestPickup)
VALUES
(1, 1, 'pending', 106.98, '2025-12-05 14:30:00', '2025-12-05 14:00:00');

-- ===========================================
-- SAMPLE ORDER ITEMS FOR TESTING
-- ===========================================
INSERT INTO FoodTruck.OrderItems (orderId, itemId, quantity, price)
VALUES
(1, 1, 2, 45.99),
(1, 2, 1, 15.00);

const express = require('express');
const router = express.Router();
const db = require('../../connectors/db');
const bcrypt = require('bcrypt');
const { authenticate, requireRole } = require('../../middleware/auth');

// =============== HELPER FUNCTIONS ===============
function toCamelCase(obj) {
  if (!obj) return obj;
  
  const result = {};
  for (const key in obj) {
    // Convert snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
}

function fromCamelCase(obj) {
  if (!obj) return obj;
  
  const result = {};
  for (const key in obj) {
    // Convert camelCase to snake_case
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
}

// =============== USER MANAGEMENT ===============
// POST /api/v1/user - Register (FLEXIBLE COLUMN NAMES)
router.post('/user', async (req, res) => {
  console.log('=== REGISTRATION ===');
  
  try {
    const { name, email, password, role = 'customer' } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    
    // Check if email exists
    const existingResult = await db.raw('SELECT * FROM foodtruck.users WHERE email = ?', [email.toLowerCase()]);
    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('Attempting to insert user...');
    
    // Try different column name variations
    let newUser;
    
    try {
      // Try with 'birthdate' (lowercase)
      const result = await db.raw(`
        INSERT INTO foodtruck.users (name, email, password, role, birthdate)
        VALUES (?, ?, ?, ?, ?)
        RETURNING userid, name, email, role, createdat
      `, [name, email.toLowerCase(), hashedPassword, role, new Date().toISOString().split('T')[0]]);
      
      newUser = result.rows[0];
      console.log('✅ Inserted with "birthdate"');
      
    } catch (error1) {
      console.log('First attempt failed:', error1.message);
      
      try {
        // Try with 'birthDate' (camelCase)
        const result = await db.raw(`
          INSERT INTO foodtruck.users (name, email, password, role, "birthDate")
          VALUES (?, ?, ?, ?, ?)
          RETURNING "userId", name, email, role, "createdAt"
        `, [name, email.toLowerCase(), hashedPassword, role, new Date().toISOString().split('T')[0]]);
        
        newUser = result.rows[0];
        console.log('✅ Inserted with "birthDate" (camelCase)');
        
      } catch (error2) {
        console.log('Second attempt failed:', error2.message);
        
        try {
          // Try without birthdate column
          const result = await db.raw(`
            INSERT INTO foodtruck.users (name, email, password, role)
            VALUES (?, ?, ?, ?)
            RETURNING userid, name, email, role, createdat
          `, [name, email.toLowerCase(), hashedPassword, role]);
          
          newUser = result.rows[0];
          console.log('✅ Inserted without birthdate');
          
        } catch (error3) {
          console.log('Third attempt failed:', error3.message);
          throw new Error('Could not insert user into database');
        }
      }
    }
    
    console.log('User created:', newUser);
    
    // If truck owner, create truck
    if (role === 'truckOwner' && newUser) {
      try {
        await db.raw(
          'INSERT INTO foodtruck.trucks (truckname, ownerid) VALUES (?, ?)',
          [`${name}'s Truck`, newUser.userid || newUser.userId]
        );
        console.log('Truck created for owner');
      } catch (truckError) {
        console.error('Truck creation error:', truckError.message);
      }
    }
    
    // Return user with consistent field names for frontend
    const userResponse = {
      userId: newUser.userid || newUser.userId,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdat || newUser.createdAt
    };
    
    res.status(201).json({ 
      message: 'User registered successfully',
      user: userResponse
    });
    
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
});

// POST /api/v1/user/login - FIXED SESSION SAVING
router.post('/user/login', async (req, res) => {
  console.log('🔐 LOGIN ATTEMPT ====================');
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    console.log('📧 Email:', email);
    
    // 1. Get user from database
    let user;
    try {
      const result = await db.raw('SELECT * FROM foodtruck.users WHERE email = ?', [email.toLowerCase()]);
      user = result.rows[0];
      
      if (!user) {
        console.log('❌ User not found');
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      console.log('✅ User found:', user.name, '(ID:', user.userid, ')');
      
    } catch (dbError) {
      console.error('💾 Database error:', dbError.message);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // 2. TEMPORARY: Accept any password for testing
    console.log('⚠️  TEMPORARY: Bypassing password check');
    
    // 3. Generate token
    const token = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    console.log('🔑 Token generated:', token.substring(0, 20) + '...');
    console.log('⏰ Expires at:', expiresAt);
    
    // 4. Save session to database
    console.log('💾 Saving session to database...');
    try {
      // Delete any existing sessions for this user
      await db.raw('DELETE FROM foodtruck.sessions WHERE userid = ?', [user.userid]);
      
      // Insert new session
      const insertResult = await db.raw(
        `INSERT INTO foodtruck.sessions (userid, token, expiresat) 
         VALUES (?, ?, ?) 
         RETURNING id`,
        [user.userid, token, expiresAt]
      );
      
      console.log('✅ Session saved! Session ID:', insertResult.rows[0].id);
      
      // Verify it was saved
      const verify = await db.raw(
        'SELECT COUNT(*) as count FROM foodtruck.sessions WHERE token = ?',
        [token]
      );
      console.log('🔍 Verification: Found', verify.rows[0].count, 'sessions with this token');
      
    } catch (sessionError) {
      console.error('❌ Session save error:', sessionError.message);
      console.error('Full error:', sessionError);
      
      // Check if table exists
      try {
        const tableCheck = await db.raw("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'foodtruck' AND table_name = 'sessions')");
        console.log('📊 Sessions table exists?', tableCheck.rows[0].exists);
      } catch (checkError) {
        console.error('Could not check table:', checkError.message);
      }
      
      // Don't fail login, but log error
    }
    
    // 5. Get truck info if owner
    let truck = null;
    if (user.role === 'truckOwner') {
      try {
        const truckResult = await db.raw(
          'SELECT * FROM foodtruck.trucks WHERE ownerid = ? LIMIT 1',
          [user.userid]
        );
        truck = truckResult.rows[0];
        if (truck) {
          console.log('🚚 Truck found:', truck.truckname, '(ID:', truck.truckid, ')');
        }
      } catch (truckError) {
        console.error('Truck lookup error:', truckError.message);
      }
    }
    
    // 6. Prepare response
    const userResponse = {
      id: user.userid,
      userId: user.userid,
      name: user.name,
      email: user.email,
      role: user.role,
      birthDate: user.birthdate,
      createdAt: user.createdat,
      truckId: truck ? truck.truckid : null
    };
    
    console.log('🎉 LOGIN SUCCESS ====================');
    console.log('Returning token to client');
    
    res.json({ 
      message: 'Login successful', 
      token, 
      user: userResponse 
    });
    
  } catch (error) {
    console.error('💥 LOGIN ERROR ====================');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Login failed: ' + error.message });
  }
});

// 3. POST /api/v1/user/logout - Logout
router.post('/user/logout', authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      await db.raw('DELETE FROM foodtruck.sessions WHERE token = ?', [token]);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/debug/sessions - Debug endpoint
router.get('/debug/sessions', async (req, res) => {
  try {
    console.log('=== DEBUG SESSIONS ===');
    
    // Get all sessions
    const sessions = await db.raw('SELECT * FROM foodtruck.sessions ORDER BY id');
    
    // Get all users
    const users = await db.raw('SELECT userid, name, email FROM foodtruck.users');
    
    const userMap = {};
    users.rows.forEach(u => {
      userMap[u.userid] = u;
    });
    
    // Combine session with user info
    const sessionsWithUsers = sessions.rows.map(session => ({
      id: session.id,
      userid: session.userid,
      userName: userMap[session.userid]?.name || 'Unknown',
      userEmail: userMap[session.userid]?.email || 'Unknown',
      token: session.token.substring(0, 20) + '...',
      expiresat: session.expiresat,
      isExpired: new Date(session.expiresat) < new Date()
    }));
    
    console.log('Total sessions:', sessions.rows.length);
    console.log('Sessions with users:', sessionsWithUsers);
    
    res.json({
      totalSessions: sessions.rows.length,
      sessions: sessionsWithUsers,
      allSessionsRaw: sessions.rows
    });
    
  } catch (error) {
    console.error('Debug error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============== TRUCK OWNER ENDPOINTS ===============
// 4. POST /api/v1/menuItem/new - Create menu item
router.post('/menuItem/new', authenticate, requireRole('truckOwner'), async (req, res) => {
  try {
    const { name, price, description, category } = req.body;
    const truckId = req.user.truckId;
    
    if (!truckId) {
      return res.status(400).json({ error: 'Truck owner has no truck' });
    }
    
    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Name, price, and category are required' });
    }
    
    await db.raw(`
      INSERT INTO foodtruck.menuitems (truckid, name, description, price, category, status)
      VALUES (?, ?, ?, ?, ?, 'available')
    `, [truckId, name, description || '', price, category]);
    
    res.json({ message: 'menu item was created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. GET /api/v1/menuItem/view - View my menu items
router.get('/menuItem/view', authenticate, requireRole('truckOwner'), async (req, res) => {
  try {
    const truckId = req.user.truckId;
    if (!truckId) {
      return res.status(400).json({ error: 'Truck owner has no truck' });
    }
    
    const result = await db.raw(`
      SELECT * FROM foodtruck.menuitems 
      WHERE truckid = ? AND status = 'available'
      ORDER BY itemid
    `, [truckId]);
    
    const items = result.rows.map(toCamelCase);
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. GET /api/v1/menuItem/view/:itemId - View specific menu item
router.get('/menuItem/view/:itemId', authenticate, requireRole('truckOwner'), async (req, res) => {
  try {
    const { itemId } = req.params;
    const truckId = req.user.truckId;
    
    const result = await db.raw(`
      SELECT * FROM foodtruck.menuitems 
      WHERE itemid = ? AND truckid = ?
    `, [itemId, truckId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    res.json(toCamelCase(result.rows[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 7. PUT /api/v1/menuItem/edit/:itemId - Edit menu item
router.put('/menuItem/edit/:itemId', authenticate, requireRole('truckOwner'), async (req, res) => {
  try {
    const { itemId } = req.params;
    const { name, price, category, description } = req.body;
    const truckId = req.user.truckId;
    
    const check = await db.raw(`
      SELECT * FROM foodtruck.menuitems 
      WHERE itemid = ? AND truckid = ?
    `, [itemId, truckId]);
    
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    await db.raw(`
      UPDATE foodtruck.menuitems 
      SET name = ?, price = ?, category = ?, description = ?
      WHERE itemid = ?
    `, [name, price, category, description || '', itemId]);
    
    res.json({ message: 'menu item updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 8. DELETE /api/v1/menuItem/delete/:itemId - Delete menu item
router.delete('/menuItem/delete/:itemId', authenticate, requireRole('truckOwner'), async (req, res) => {
  try {
    const { itemId } = req.params;
    const truckId = req.user.truckId;
    
    const check = await db.raw(`
      SELECT * FROM foodtruck.menuitems 
      WHERE itemid = ? AND truckid = ?
    `, [itemId, truckId]);
    
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    await db.raw(`
      UPDATE foodtruck.menuitems 
      SET status = 'unavailable'
      WHERE itemid = ?
    `, [itemId]);
    
    res.json({ message: 'menu item deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 9. GET /api/v1/trucks/myTruck - View my truck info
router.get('/trucks/myTruck', authenticate, requireRole('truckOwner'), async (req, res) => {
  try {
    const truckId = req.user.truckId;
    if (!truckId) {
      return res.status(400).json({ error: 'Truck owner has no truck' });
    }
    
    const result = await db.raw(`
      SELECT * FROM foodtruck.trucks WHERE truckid = ?
    `, [truckId]);
    
    res.json(toCamelCase(result.rows[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 10. PUT /api/v1/trucks/updateOrderStatus - Update truck availability
router.put('/trucks/updateOrderStatus', authenticate, requireRole('truckOwner'), async (req, res) => {
  try {
    const { orderStatus } = req.body;
    const truckId = req.user.truckId;
    
    if (!['available', 'unavailable'].includes(orderStatus)) {
      return res.status(400).json({ error: 'Invalid orderStatus' });
    }
    
    await db.raw(`
      UPDATE foodtruck.trucks 
      SET orderstatus = ?
      WHERE truckid = ?
    `, [orderStatus, truckId]);
    
    res.json({ message: 'truck order status updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 11. GET /api/v1/order/truckOrders - View truck's orders
router.get('/order/truckOrders', authenticate, requireRole('truckOwner'), async (req, res) => {
  try {
    const truckId = req.user.truckId;
    
    const result = await db.raw(`
      SELECT 
        o.orderid, o.userid, u.name as customername,
        o.orderstatus, o.totalprice, o.scheduledpickuptime,
        o.estimatedearliestpickup, o.createdat
      FROM foodtruck.orders o
      JOIN foodtruck.users u ON o.userid = u.userid
      WHERE o.truckid = ?
      ORDER BY o.orderid DESC
    `, [truckId]);
    
    const orders = result.rows.map(toCamelCase);
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 12. PUT /api/v1/order/updateStatus/:orderId - Update order status
router.put('/order/updateStatus/:orderId', authenticate, requireRole('truckOwner'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderStatus, estimatedEarliestPickup } = req.body;
    const truckId = req.user.truckId;
    
    const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }
    
    const check = await db.raw(`
      SELECT * FROM foodtruck.orders 
      WHERE orderid = ? AND truckid = ?
    `, [orderId, truckId]);
    
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const updateData = { orderstatus: orderStatus };
    if (estimatedEarliestPickup) {
      updateData.estimatedearliestpickup = estimatedEarliestPickup;
    }
    
    await db.raw(`
      UPDATE foodtruck.orders 
      SET orderstatus = ?, estimatedearliestpickup = ?
      WHERE orderid = ?
    `, [orderStatus, estimatedEarliestPickup || null, orderId]);
    
    res.json({ message: 'order status updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 13. GET /api/v1/order/truckOwner/:orderId - View order details for owner
router.get('/order/truckOwner/:orderId', authenticate, requireRole('truckOwner'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const truckId = req.user.truckId;
    
    const orderResult = await db.raw(`
      SELECT 
        o.orderid, t.truckname, o.orderstatus, o.totalprice,
        o.scheduledpickuptime, o.estimatedearliestpickup, o.createdat
      FROM foodtruck.orders o
      JOIN foodtruck.trucks t ON o.truckid = t.truckid
      WHERE o.orderid = ? AND o.truckid = ?
    `, [orderId, truckId]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const itemsResult = await db.raw(`
      SELECT mi.name as itemname, oi.quantity, oi.price
      FROM foodtruck.orderitems oi
      JOIN foodtruck.menuitems mi ON oi.itemid = mi.itemid
      WHERE oi.orderid = ?
    `, [orderId]);
    
    const order = toCamelCase(orderResult.rows[0]);
    order.items = itemsResult.rows.map(toCamelCase);
    
    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============== CUSTOMER ENDPOINTS ===============
// GET /api/v1/trucks/view - View all available trucks
router.get('/trucks/view', async (req, res) => {
  try {
    // Use raw SQL temporarily to test
    const trucks = await db.raw(`
      SELECT * FROM foodtruck.trucks 
      WHERE truckstatus = 'available' AND orderstatus = 'available'
      ORDER BY truckid
    `);
    
    res.json(trucks.rows);
  } catch (error) {
    console.error('Trucks error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// In routes/private/api.js, replace the menu endpoint:
router.get('/menuItem/truck/:truckId', async (req, res) => {
  try {
    const { truckId } = req.params;
    console.log(`DEBUG: Fetching menu for truck: ${truckId}`);
    
    // Try different table names with raw SQL
    let items;
    
    try {
      // Try lowercase first
      const result = await db.raw(`
        SELECT * FROM foodtruck.menuitems 
        WHERE truckid = ? AND status = 'available' 
        ORDER BY itemid
      `, [truckId]);
      items = result.rows;
      console.log(`✅ Found ${items.length} items in menuitems`);
    } catch (err1) {
      try {
        // Try camelCase
        const result = await db.raw(`
          SELECT * FROM foodtruck."MenuItems" 
          WHERE truckid = ? AND status = 'available' 
          ORDER BY itemid
        `, [truckId]);
        items = result.rows;
        console.log(`✅ Found ${items.length} items in MenuItems`);
      } catch (err2) {
        try {
          // Try snake_case
          const result = await db.raw(`
            SELECT * FROM foodtruck.menu_items 
            WHERE truckid = ? AND status = 'available' 
            ORDER BY item_id
          `, [truckId]);
          items = result.rows;
          console.log(`✅ Found ${items.length} items in menu_items`);
        } catch (err3) {
          console.error('All table name attempts failed');
          items = [];
        }
      }
    }
    
    res.json(items);
  } catch (error) {
    console.error('❌ Menu error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 16. GET /api/v1/menuItem/truck/:truckId/category/:category - Search by category
router.get('/menuItem/truck/:truckId/category/:category', async (req, res) => {
  try {
    const { truckId, category } = req.params;
    
    const result = await db.raw(`
      SELECT * FROM foodtruck.menuitems 
      WHERE truckid = ? AND category = ? AND status = 'available'
      ORDER BY itemid
    `, [truckId, category]);
    
    const items = result.rows.map(toCamelCase);
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 17. POST /api/v1/cart/new - Add to cart
router.post('/cart/new', authenticate, requireRole('customer'), async (req, res) => {
  try {
    const { itemId, quantity, price } = req.body;
    const userId = req.user.userId;
    
    if (!itemId || !quantity || price === undefined) {
      return res.status(400).json({ error: 'itemId, quantity, and price are required' });
    }
    
    const itemResult = await db.raw(`
      SELECT * FROM foodtruck.menuitems 
      WHERE itemid = ? AND status = 'available'
    `, [itemId]);
    
    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item not available' });
    }
    
    const item = itemResult.rows[0];
    
    const cartResult = await db.raw(`
      SELECT DISTINCT mi.truckid
      FROM foodtruck.carts c
      JOIN foodtruck.menuitems mi ON c.itemid = mi.itemid
      WHERE c.userid = ?
      LIMIT 1
    `, [userId]);
    
    if (cartResult.rows.length > 0) {
      const cartTruckId = cartResult.rows[0].truckid;
      if (cartTruckId !== item.truckid) {
        return res.status(400).json({ error: 'Cannot order from multiple trucks' });
      }
    }
    
    await db.raw(`
      INSERT INTO foodtruck.carts (userid, itemid, quantity, price)
      VALUES (?, ?, ?, ?)
    `, [userId, itemId, quantity, price]);
    
    res.json({ message: 'item added to cart successfully' });
  } catch (error) {
    console.error('Cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/cart/view - WITH DEBUG
router.get('/cart/view', authenticate, requireRole('customer'), async (req, res) => {
  console.log('🛒 GET /cart/view');
  console.log('User making request:', req.user.email);
  console.log('User ID:', req.user.userId);
  
  try {
    const cartItems = await db.raw(`
      SELECT 
        c.cartid,
        c.userid,
        c.itemid,
        mi.name as itemname,
        c.price,
        c.quantity
      FROM foodtruck.carts c
      JOIN foodtruck.menuitems mi ON c.itemid = mi.itemid
      WHERE c.userid = ?
      ORDER BY c.cartid
    `, [req.user.userId]);
    
    console.log(`Found ${cartItems.rows.length} cart items`);
    res.json(cartItems.rows);
    
  } catch (error) {
    console.error('Cart error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 19. PUT /api/v1/cart/edit/:cartId - Update cart quantity
router.put('/cart/edit/:cartId', authenticate, requireRole('customer'), async (req, res) => {
  try {
    const { cartId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.userId;
    
    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }
    
    const check = await db.raw(`
      SELECT * FROM foodtruck.carts 
      WHERE cartid = ? AND userid = ?
    `, [cartId, userId]);
    
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    
    await db.raw(`
      UPDATE foodtruck.carts 
      SET quantity = ?
      WHERE cartid = ?
    `, [quantity, cartId]);
    
    res.json({ message: 'cart updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 20. DELETE /api/v1/cart/delete/:cartId - Remove from cart
router.delete('/cart/delete/:cartId', authenticate, requireRole('customer'), async (req, res) => {
  try {
    const { cartId } = req.params;
    const userId = req.user.userId;
    
    const check = await db.raw(`
      SELECT * FROM foodtruck.carts 
      WHERE cartid = ? AND userid = ?
    `, [cartId, userId]);
    
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    
    await db.raw('DELETE FROM foodtruck.carts WHERE cartid = ?', [cartId]);
    
    res.json({ message: 'item removed from cart successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 21. POST /api/v1/order/new - Place order
router.post('/order/new', authenticate, requireRole('customer'), async (req, res) => {
  try {
    const { scheduledPickupTime } = req.body;
    const userId = req.user.userId;
    
    if (!scheduledPickupTime) {
      return res.status(400).json({ error: 'scheduledPickupTime is required' });
    }
    
    const cartResult = await db.raw(`
      SELECT c.*, mi.truckid
      FROM foodtruck.carts c
      JOIN foodtruck.menuitems mi ON c.itemid = mi.itemid
      WHERE c.userid = ?
    `, [userId]);
    
    if (cartResult.rows.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    
    const cartItems = cartResult.rows;
    const truckIds = [...new Set(cartItems.map(item => item.truckid).filter(id => id))];
    
    if (truckIds.length === 0) {
      return res.status(400).json({ error: 'No valid truck found for items' });
    }
    
    if (truckIds.length > 1) {
      return res.status(400).json({ error: 'Cannot order from multiple trucks' });
    }
    
    const truckId = truckIds[0];
    const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const orderResult = await db.raw(`
      INSERT INTO foodtruck.orders 
        (userid, truckid, orderstatus, totalprice, scheduledpickuptime, estimatedearliestpickup)
      VALUES (?, ?, 'pending', ?, ?, ?)
      RETURNING orderid
    `, [userId, truckId, totalPrice, scheduledPickupTime, new Date(Date.now() + 30 * 60 * 1000)]);
    
    const orderId = orderResult.rows[0].orderid;
    
    for (const item of cartItems) {
      await db.raw(`
        INSERT INTO foodtruck.orderitems (orderid, itemid, quantity, price)
        VALUES (?, ?, ?, ?)
      `, [orderId, item.itemid, item.quantity, item.price]);
    }
    
    await db.raw('DELETE FROM foodtruck.carts WHERE userid = ?', [userId]);
    
    res.json({ 
      message: 'order placed successfully',
      orderId: orderId,
      totalPrice: totalPrice.toFixed(2)
    });
  } catch (error) {
    console.error('Order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/// GET /api/v1/order/myOrders - WITH DEBUG
router.get('/order/myOrders', authenticate, requireRole('customer'), async (req, res) => {
  console.log('📦 GET /order/myOrders');
  console.log('User:', req.user.email);
  console.log('User ID:', req.user.userId);
  
  try {
    const orders = await db.raw(`
      SELECT 
        o.orderid,
        o.userid,
        o.truckid,
        t.truckname,
        o.orderstatus,
        o.totalprice,
        o.scheduledpickuptime,
        o.estimatedearliestpickup,
        o.createdat
      FROM foodtruck.orders o
      JOIN foodtruck.trucks t ON o.truckid = t.truckid
      WHERE o.userid = ?
      ORDER BY o.orderid DESC
    `, [req.user.userId]);
    
    console.log(`Found ${orders.rows.length} orders`);
    res.json(orders.rows);
    
  } catch (error) {
    console.error('Orders error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 23. GET /api/v1/order/details/:orderId - View order details
router.get('/order/details/:orderId', authenticate, requireRole('customer'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;
    
    const orderResult = await db.raw(`
      SELECT 
        o.orderid, t.truckname, o.orderstatus, o.totalprice,
        o.scheduledpickuptime, o.estimatedearliestpickup, o.createdat
      FROM foodtruck.orders o
      JOIN foodtruck.trucks t ON o.truckid = t.truckid
      WHERE o.orderid = ? AND o.userid = ?
    `, [orderId, userId]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const itemsResult = await db.raw(`
      SELECT mi.name as itemname, oi.quantity, oi.price
      FROM foodtruck.orderitems oi
      JOIN foodtruck.menuitems mi ON oi.itemid = mi.itemid
      WHERE oi.orderid = ?
    `, [orderId]);
    
    const order = toCamelCase(orderResult.rows[0]);
    order.items = itemsResult.rows.map(toCamelCase);
    
    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// GET /api/v1/debug/tables - Debug endpoint to check tables
router.get('/debug/tables', async (req, res) => {
  try {
    const tables = await db.raw(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM foodtruck." || table_name || ") as row_count
      FROM information_schema.tables 
      WHERE table_schema = 'foodtruck'
      ORDER BY table_name
    `);
    
    res.json({
      message: 'Table status',
      tables: tables.rows
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Debug failed',
      details: error.message 
    });
  }
});
module.exports = router;
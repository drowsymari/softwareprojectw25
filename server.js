require('dotenv').config();
const express = require('express');
const path = require('path');
const exphbs = require('express-handlebars');

const app = express();

// Configure Handlebars
const hbs = exphbs.create({
  extname: '.hjs',
  defaultLayout: false,
  helpers: {
    json: function(context) {
      return JSON.stringify(context);
    }
  }
});

app.engine('.hjs', hbs.engine);
app.set('view engine', '.hjs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico'],
  index: false  // Don't serve index.html
}));

// Import routes
const privateApiRoutes = require('./routes/private/api');
const publicApiRoutes = require('./routes/public/api');

// Use routes
app.use('/api/v1', privateApiRoutes);
app.use('/api/v1/public', publicApiRoutes);

// =============== VIEW ROUTES ===============

// Home page - RENDER index.hjs, don't serve index.html
app.get('/', (req, res) => {
  res.render('index', { 
    title: 'GIU Food Truck System',
    user: null
  });
});

// Login page
app.get('/login', (req, res) => {
  res.render('login', { 
    title: 'Login - GIU Food Truck',
    error: null,
    user: null
  });
});

// Register page
app.get('/register', (req, res) => {
  res.render('register', { 
    title: 'Register - GIU Food Truck',
    error: null,
    user: null
  });
});

// Customer dashboard
app.get('/customerHomepage', (req, res) => {
  res.render('customerHomepage', {
    user: { name: 'Customer', email: 'customer@example.com' }
  });
});

// Truck owner dashboard
app.get('/truckOwnerHomePage', (req, res) => {
  res.render('truckOwnerHomePage', {
    user: { 
      name: 'Truck Owner', 
      email: 'owner@example.com',
      truckId: 1,
      truckName: 'My Food Truck'
    }
  });
});

// Logout route
app.get('/logout', (req, res) => {
  res.redirect('/login');
});

// 404 handler - use render, not sendFile
app.use((req, res) => {
  res.status(404).render('404', { 
    title: 'Page Not Found',
    message: 'The page you requested could not be found.',
    user: null
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    title: 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!',
    user: null
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${process.env.PG_DATABASE || 'giu_foodtruck'} on port ${process.env.PG_PORT || 2025}`);
  console.log(`🎨 Templates: Serving .hjs files from views/ folder`);
});
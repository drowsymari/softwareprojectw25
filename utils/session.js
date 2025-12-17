const db = require('../connectors/db');

async function getUser(token) {
  console.log('\n🔍 GETUSER CALLED ====================');
  console.log('Token:', token ? token.substring(0, 20) + '...' : 'No token');
  
  if (!token || token === 'null' || token === 'undefined') {
    console.log('❌ Invalid token format');
    return null;
  }
  
  try {
    // 1. Check session in database
    console.log('📊 Querying sessions table...');
    let sessionResult;
    try {
      sessionResult = await db.raw(`
        SELECT s.*, u.*, t.truckid 
        FROM foodtruck.sessions s
        JOIN foodtruck.users u ON s.userid = u.userid
        LEFT JOIN foodtruck.trucks t ON u.userid = t.ownerid
        WHERE s.token = ? AND s.expiresat > NOW()
        LIMIT 1
      `, [token]);
    } catch (sqlError) {
      console.error('❌ SQL error:', sqlError.message);
      
      // Fallback: simple session check
      try {
        sessionResult = await db.raw(
          'SELECT * FROM foodtruck.sessions WHERE token = ? AND expiresat > NOW()',
          [token]
        );
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError.message);
        return null;
      }
    }
    
    const sessionWithUser = sessionResult.rows[0];
    
    if (!sessionWithUser) {
      console.log('❌ No valid session found for token');
      
      // Debug: Check what's in sessions table
      try {
        const allSessions = await db.raw('SELECT COUNT(*) as count FROM foodtruck.sessions');
        console.log('📊 Total sessions in DB:', allSessions.rows[0].count);
        
        const expiredSessions = await db.raw(
          'SELECT COUNT(*) as count FROM foodtruck.sessions WHERE expiresat <= NOW()'
        );
        console.log('📊 Expired sessions:', expiredSessions.rows[0].count);
      } catch (countError) {
        console.log('Could not count sessions');
      }
      
      return null;
    }
    
    console.log('✅ Session found for user:', sessionWithUser.email);
    console.log('⏰ Session expires at:', sessionWithUser.expiresat);
    
    // 2. Build user object (transform to camelCase for frontend)
    const user = {
      id: sessionWithUser.userid,
      userId: sessionWithUser.userid,
      name: sessionWithUser.name,
      email: sessionWithUser.email,
      role: sessionWithUser.role,
      birthDate: sessionWithUser.birthdate,
      createdAt: sessionWithUser.createdat,
      truckId: sessionWithUser.truckid,
      token: sessionWithUser.token,
      expiresAt: sessionWithUser.expiresat
    };
    
    console.log('🎉 GETUSER SUCCESS ====================');
    return user;
    
  } catch (error) {
    console.error('💥 GETUSER ERROR ====================');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return null;
  }
}

module.exports = { getUser };
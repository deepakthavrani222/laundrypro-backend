const app = require('./src/app');
const connectDB = require('./src/config/database');

const PORT = process.env.PORT || 5000;

// ============================================
// KEEP-ALIVE: Prevent Render Free Tier Sleep
// ============================================
const keepAlive = () => {
  const INTERVAL = 14 * 60 * 1000; // 14 minutes
  
  setInterval(async () => {
    try {
      const url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
      const response = await fetch(`${url}/health`);
      if (response.ok) {
        console.log('🏓 Keep-alive ping successful');
      }
    } catch (err) {
      // Silent fail - don't crash server
    }
  }, INTERVAL);
  
  console.log('⏰ Keep-alive started (pings every 14 min)');
};

// Connect to MongoDB (optional for development)
connectDB().catch(err => {
  console.warn('⚠️  MongoDB connection failed, running without database');
  console.warn('💡 Some features will be limited without database connection');
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/api`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});
module.exports = {
  PORT: process.env.PORT || 8000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://logging_admin@localhost/logging',
  TEST_DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://logging_admin@localhost/logging-test',
  CLIENT_ORIGIN: 'https://logging-app-kpozyjuzt.vercel.app',
  API_TOKEN: process.env.API_TOKEN
};
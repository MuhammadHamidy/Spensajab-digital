// jest.setup-env.js
process.env.DATABASE_URL = 'postgres://postgres:root@localhost:5432/testdb';
process.env.JWT_SECRET = 'supersecretjwtsecretstringmustbelong';
process.env.NODE_ENV = 'test';

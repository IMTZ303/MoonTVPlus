if (!process.env.PASSWORD) {
  throw new Error('Set PASSWORD to the administrator password before starting MoonTV.');
}
require('./scripts/init-sqlite.js').initSQLiteDatabase();
require('./server.js');

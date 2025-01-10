const { app, BrowserWindow, ipcMain } = require('electron');
const sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('./pos.db');

db.run(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total_amount REAL NOT NULL,
    sale_date TEXT NOT NULL
  )
`);

function addProduct(name, price, quantity) {
    const stmt = db.prepare('INSERT INTO products (name, price, quantity) VALUES (?, ?, ?)');
    stmt.run(name, price, quantity);
    stmt.finalize();
}

function editProduct(id, name, price, quantity) {
    const stmt = db.prepare('UPDATE products SET name = ?, price = ?, quantity = ? WHERE id = ?');
    stmt.run(name, price, quantity, id);
    stmt.finalize();
}

function deleteProduct(id) {
    const stmt = db.prepare('DELETE FROM products WHERE id = ?');
    stmt.run(id);
    stmt.finalize();
}

function viewProducts(callback) {
    db.all('SELECT * FROM products', [], (err, rows) => {
        if (err) {
            console.error('Error fetching products:', err);
        } else {
            callback(rows);
        }
    });
}

ipcMain.on('update-product-stock', (event, productId, quantitySold) => {
    const stmt = db.prepare('UPDATE products SET quantity = quantity - ? WHERE id = ?');
    stmt.run(quantitySold, productId);
    stmt.finalize();
});

ipcMain.on('save-sale', (event, cart, totalAmount) => {
    const stmt = db.prepare('INSERT INTO sales (total_amount, sale_date) VALUES (?, ?)');
    stmt.run(totalAmount, new Date().toISOString());
    stmt.finalize();
});

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true
        }
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();

    ipcMain.on('add-product', (event, product) => {
        addProduct(product.name, product.price, product.quantity);
        viewProducts((products) => event.reply('product-list', products));
    });

    ipcMain.on('edit-product', (event, product) => {
        editProduct(product.id, product.name, product.price, product.quantity);
        viewProducts((products) => event.reply('product-list', products));
    });

    ipcMain.on('delete-product', (event, id) => {
        deleteProduct(id);
        viewProducts((products) => event.reply('product-list', products));
    });

    ipcMain.on('fetch-products', (event) => {
        viewProducts((products) => event.reply('product-list', products));
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
}
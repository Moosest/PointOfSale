const { ipcRenderer } = require('electron');

document.getElementById('addProductForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('productName').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const quantity = parseInt(document.getElementById('productQuantity').value);

    ipcRenderer.send('add-product', { name, price, quantity });
});

function showProductsForSale(products) {
    const salesTableBody = document.querySelector('#salesTable tbody');
    salesTableBody.innerHTML = '';

    products.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
      <td>${product.id}</td>
      <td>${product.name}</td>
      <td>${product.price}</td>
      <td>
        <button onclick="addToCart(${product.id})">Add to Cart</button>
      </td>
    `;
        salesTableBody.appendChild(row);
    });
}

let cart = [];

function addToCart(productId) {
    ipcRenderer.send('fetch-products', (products) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            cart.push({ ...product, quantity: 1 });
            updateCartUI();
        }
    });
}

function updateCartUI() {
    const cartTableBody = document.querySelector('#cartTable tbody');
    cartTableBody.innerHTML = '';

    cart.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
      <td>${item.id}</td>
      <td>${item.name}</td>
      <td>${item.price}</td>
      <td><input type="number" value="${item.quantity}" onchange="updateCartQuantity(${item.id}, this.value)"></td>
      <td>${(item.price * item.quantity).toFixed(2)}</td>
      <td><button onclick="removeFromCart(${item.id})">Remove</button></td>
    `;
        cartTableBody.appendChild(row);
    });
}

function updateCartQuantity(productId, newQuantity) {
    const productInCart = cart.find(p => p.id === productId);
    if (productInCart) {
        productInCart.quantity = parseInt(newQuantity);
        updateCartUI();
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
}

function completeTransaction() {
    let totalAmount = 0;

    cart.forEach(item => {
        totalAmount += item.price * item.quantity;
        ipcRenderer.send('update-product-stock', item.id, item.quantity);
    });

    ipcRenderer.send('save-sale', cart, totalAmount);

    cart = [];
    updateCartUI();
    alert(`Sale completed! Total: $${totalAmount.toFixed(2)}`);
}

window.onload = () => {
    ipcRenderer.send('fetch-products', (products) => {
        showProductsForSale(products);
    });
}

const addItem = document.getElementById('add-items-form');
const deleteItem = document.getElementById('del-items-form');
const getItem = document.getElementById('get-items-form');
const updateItem = document.getElementById('up-items-form');
const output = document.getElementById('user-output');

// Add item
addItem.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(addItem);
  const model = formData.get('model');
  const product = formData.get('product');
  const variant = formData.get('variant');
  const price = formData.get('price');
  const quantity = formData.get('quantity');
  const description = formData.get('description');

  if (!model || !product || !variant || !price || !quantity) {
    output.textContent = 'Fill all fields please';
    return;
  }

  try {
    const res = await fetch(`/admin/product`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        product,
        variant: {
          name: variant,
          price,
          quantity,
          description
        }
      })
    });

    const contentType = res.headers.get('content-type');
    const text = await (contentType && contentType.includes('application/json') ? res.json() : res.text());
    output.textContent = res.ok ? JSON.stringify(text, null, 2) : `Error ${res.status}: ${text}`;
  } catch (error) {
    output.textContent = `Error: ${error.message}`;
  }
});

// Get item
getItem.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(getItem);
  const model = formData.get('model');
  const option = formData.get('option');
  const variant = formData.get('variant');

  if (!model || !option || !variant) {
    output.textContent = 'Please fill in model, option, and variant.';
    return;
  }

  const params = new URLSearchParams({ model, option, variant }).toString();

  try {
    const res = await fetch(`/admin/product?${params}`);
    const contentType = res.headers.get('content-type');
    const text = await (contentType && contentType.includes('application/json') ? res.json() : res.text());
    output.textContent = res.ok ? JSON.stringify(text, null, 2) : `Error ${res.status}: ${text}`;
  } catch (error) {
    output.textContent = `Error: ${error.message}`;
  }
});

// Delete item
deleteItem.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(deleteItem);
  const model = formData.get('model');
  const option = formData.get('option');
  const variant = formData.get('variant');

  if (!model || !option || !variant) {
    output.textContent = 'Please fill in model, option, and variant.';
    return;
  }

  try {
    const res = await fetch('/admin/product', {
      method: 'DELETE',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, option, variant })
    });

    const contentType = res.headers.get('content-type');
    const text = await (contentType && contentType.includes('application/json') ? res.json() : res.text());
    output.textContent = res.ok ? JSON.stringify(text, null, 2) : `Error ${res.status}: ${text}`;
  } catch (error) {
    output.textContent = `Error: ${error.message}`;
  }
});

// Update item
updateItem.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(updateItem);
  const model = formData.get('model');
  const product = formData.get('product');
  const variant = formData.get('variant');
  const price = formData.get('price');
  const quantity = formData.get('quantity');
  const description = formData.get('description');

  if (!model || !product || !variant) {
    output.textContent = 'Model, product, and variant are required';
    return;
  }

  const payload = {
    model,
    product,
    variant: {
      name: variant
    }
  };

  if (price) payload.variant.price = price;
  if (quantity) payload.variant.quantity = quantity;
  if (description) payload.variant.description = description;

  try {
    const res = await fetch('/admin/product', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const contentType = res.headers.get('content-type');
    const text = await (contentType && contentType.includes('application/json') ? res.json() : res.text());
    output.textContent = res.ok ? JSON.stringify(text, null, 2) : `Error ${res.status}: ${text}`;
  } catch (error) {
    output.textContent = `Error: ${error.message}`;
  }
});

// Logout
const logoutBtn = document.getElementById('logout-btn');
logoutBtn.addEventListener('click', async () => {
  try {
    const res = await fetch('/admin/logout', {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    if (res.ok) {
      alert('Logged out successfully');
      window.location.href = '/index.html';
    } else {
      const data = await res.json();
      alert(`Logout failed: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
});

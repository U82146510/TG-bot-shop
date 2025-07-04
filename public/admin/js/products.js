const addProduct = document.getElementById('create-model-form');
const deleteProduct = document.getElementById('delete-model-form');
const getProduct = document.getElementById('get-model-form');
const output = document.getElementById('user-output');

// GET Model
getProduct.addEventListener('submit', async (e) => {
  e.preventDefault();
  const model = new FormData(getProduct).get('model');
  if (!model) {
    output.textContent = 'Please enter a model';
    return;
  }
  try {
    const res = await fetch(`/admin/model/${encodeURIComponent(model)}`);
    const contentType = res.headers.get('content-type');
    if (!res.ok) {
      const text = await res.text();
      output.textContent = `Error ${res.status}: ${text}`;
      return;
    }
    const result = contentType.includes('application/json') ? await res.json() : await res.text();
    output.textContent = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  } catch (err) {
    output.textContent = `Error: ${err.message}`;
  }
});

// DELETE Model
deleteProduct.addEventListener('submit', async (e) => {
  e.preventDefault();
  const model = new FormData(deleteProduct).get('model');
  if (!model) {
    output.textContent = 'Please enter a model';
    return;
  }
  try {
    const res = await fetch(`/admin/model/${encodeURIComponent(model)}`, { method: "DELETE" });
    const contentType = res.headers.get('content-type');
    const result = contentType.includes('application/json') ? await res.json() : await res.text();
    output.textContent = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  } catch (err) {
    output.textContent = `Error: ${err.message}`;
  }
});

// ADD Product
addProduct.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(addProduct);
  const payload = {
    name: formData.get('model'),
    models: [{
      name: formData.get('product'),
      options: [{
        name: formData.get('variant'),
        price: formData.get('price'),
        quantity: formData.get('quantity'),
        description: formData.get('description')
      }]
    }]
  };

  try {
    const res = await fetch(`/admin/model`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const contentType = res.headers.get('content-type');
    const result = contentType.includes('application/json') ? await res.json() : await res.text();
    output.textContent = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  } catch (err) {
    output.textContent = `Error: ${err.message}`;
  }
});

// LOGOUT
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

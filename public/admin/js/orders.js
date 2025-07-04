const getOrders = document.getElementById('get-orders-form');
const delOrders = document.getElementById('delete-orders-form');
const updateOrders = document.getElementById('edit-orders-form');
const output = document.getElementById('user-output');

getOrders.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formOrders = new FormData(getOrders);
  const status = formOrders.get('status');
  const orderId = formOrders.get('orderId');
  const userId = formOrders.get('userId');
  const page = formOrders.get('page');
  const limit = formOrders.get('limit');

  if (!status) {
    output.textContent = 'Please select Order status';
    return;
  }

  const params = new URLSearchParams({
    status,
    page,
    limit,
    userId,
    orderId
  }).toString();

  try {
    const res = await fetch(`/admin/orders?${params}`);
    const contentType = res.headers.get('content-type');

    if (!res.ok) {
      const text = await res.text();
      output.textContent = `Error ${res.status}: ${text}`;
      return;
    }

    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      output.textContent = JSON.stringify(data, null, 2);
    } else {
      const text = await res.text();
      output.textContent = text;
    }
  } catch (error) {
    output.textContent = `Error: ${error.message}`;
  }
});

delOrders.addEventListener('submit', async (e) => {
  e.preventDefault();
  const orderId = new FormData(delOrders).get('orderId');

  if (!orderId) {
    output.textContent = 'Please enter an Order ID';
    return;
  }

  try {
    const res = await fetch(`/admin/orders/${orderId}`, {
      method: "DELETE"
    });
    const contentType = res.headers.get('content-type');

    if (!res.ok) {
      const text = await res.text();
      output.textContent = `Error ${res.status}: ${text}`;
      return;
    }

    const data = await res.json();
    output.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    output.textContent = `Error: ${error.message}`;
  }
});

updateOrders.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(updateOrders);
  const orderId = formData.get('orderId');
  const status = formData.get('status');

  if (!orderId || !status) {
    output.textContent = 'Please fill in all fields';
    return;
  }

  try {
    const res = await fetch(`/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    const contentType = res.headers.get('content-type');
    if (!res.ok) {
      const text = await res.text();
      output.textContent = `Error ${res.status}: ${text}`;
      return;
    }

    const data = await res.json();
    output.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    output.textContent = `Error: ${error.message}`;
  }
});

// Logout handler
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

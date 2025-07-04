const payment = document.getElementById('get-payment-form');
const output = document.getElementById('user-output');

payment.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(payment);
  const params = new URLSearchParams(formData);

  try {
    const res = await fetch(`/admin/payment?${params}`);
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

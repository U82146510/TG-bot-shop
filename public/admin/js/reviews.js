const getReview = document.getElementById('get-reviews-form');
const delReview = document.getElementById('delete-reviews-form');
const updateReview = document.getElementById('edit-reviews-form');
const output = document.getElementById('user-output');

// GET reviews
getReview.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const res = await fetch(`/admin/review`);
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

// DELETE review
delReview.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = new FormData(delReview).get('id');
  if (!id) {
    output.textContent = 'Please enter a review ID';
    return;
  }

  try {
    const res = await fetch(`/admin/review/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    const contentType = res.headers.get('content-type');
    const result = contentType && contentType.includes('application/json')
      ? await res.json()
      : await res.text();
    output.textContent = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  } catch (error) {
    output.textContent = `Error: ${error.message}`;
  }
});

// PATCH (Approve) review
updateReview.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = new FormData(updateReview).get('id');
  if (!id) {
    output.textContent = 'Please enter a review ID';
    return;
  }

  try {
    const res = await fetch(`/admin/review/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });
    const contentType = res.headers.get('content-type');
    const result = contentType && contentType.includes('application/json')
      ? await res.json()
      : await res.text();
    output.textContent = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  } catch (error) {
    output.textContent = `Error: ${error.message}`;
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

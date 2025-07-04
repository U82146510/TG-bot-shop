const getUser = document.getElementById('get-users-form');
const delUser = document.getElementById('delete-users-form');
const updateUser = document.getElementById('create-user-form');
const output = document.getElementById('user-output');

delUser.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = new FormData(delUser).get('username');

  if (!username) {
    output.textContent = 'Please enter a username';
    return;
  }

  try {
    const res = await fetch(`/admin/users/${encodeURIComponent(username)}`, {
      method: "DELETE"
    });
    const contentType = res.headers.get('content-type');
    const text = await res.text();
    output.textContent = contentType?.includes('application/json') ? JSON.stringify(JSON.parse(text), null, 2) : text;
  } catch (error) {
    output.textContent = `Error: ${error.message}`;
  }
});

getUser.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = new FormData(getUser).get('username');

  if (!username) {
    output.textContent = 'Please enter a username';
    return;
  }

  try {
    const res = await fetch(`/admin/users/${encodeURIComponent(username)}`);
    const contentType = res.headers.get('content-type');
    const text = await res.text();
    output.textContent = contentType?.includes('application/json') ? JSON.stringify(JSON.parse(text), null, 2) : text;
  } catch (error) {
    output.textContent = `Error: ${error.message}`;
  }
});

updateUser.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(updateUser);
  const username = formData.get('username');
  const balance = formData.get('balance');

  if (!username || !balance) {
    output.textContent = 'Please enter both username and balance';
    return;
  }

  try {
    const res = await fetch(`/admin/users/${encodeURIComponent(username)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, balance })
    });
    const contentType = res.headers.get('content-type');
    const text = await res.text();
    output.textContent = contentType?.includes('application/json') ? JSON.stringify(JSON.parse(text), null, 2) : text;
  } catch (error) {
    output.textContent = `Error: ${error.message}`;
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    const res = await fetch('/admin/logout', {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();
    if (res.ok) {
      alert('Logged out successfully');
      window.location.href = '/index.html';
    } else {
      alert(`Logout failed: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
});

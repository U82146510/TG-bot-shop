const signupForm = document.getElementById('signup-form');
const updateForm = document.getElementById('update-form');
const signupOutput = document.getElementById('signup-output');
const updateOutput = document.getElementById('update-output');

// Signup Handler
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(signupForm);
  const email = formData.get('email');
  const password = formData.get('password');
  const pinCode = formData.get('pinCode');

  if (!email || !password || !pinCode) {
    signupOutput.textContent = 'Please fill all fields.';
    return;
  }

  try {
    const res = await fetch('/admin/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, pinCode })
    });

    const contentType = res.headers.get('content-type');
    if (!res.ok) {
      const text = await res.text();
      signupOutput.textContent = `Error ${res.status}: ${text}`;
      return;
    }

    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      signupOutput.textContent = data.message || 'User created successfully. Redirecting...';
      signupForm.reset();
      setTimeout(() => window.location.href = '/admin/users.html', 1000);
    } else {
      signupOutput.textContent = await res.text();
    }
  } catch (err) {
    signupOutput.textContent = `Error: ${err.message}`;
  }
});

// Update Password Handler
updateForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(updateForm);
  const email = formData.get('email');
  const password = formData.get('password');
  const pinCode = formData.get('pinCode');

  if (!email || !password || !pinCode) {
    updateOutput.textContent = 'Please fill all fields.';
    return;
  }

  try {
    const res = await fetch('/admin/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, pinCode })
    });

    const contentType = res.headers.get('content-type');
    if (!res.ok) {
      const text = await res.text();
      updateOutput.textContent = `Error ${res.status}: ${text}`;
      return;
    }

    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      updateOutput.textContent = data.message || 'Password updated successfully.';
      updateForm.reset();
      setTimeout(() => updateOutput.textContent = 'Awaiting update...', 3000);
    } else {
      updateOutput.textContent = await res.text();
    }
  } catch (err) {
    updateOutput.textContent = `Error: ${err.message}`;
  }
});

// Logout Handler
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

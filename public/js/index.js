const loginForm = document.getElementById('login-form');
  const loginOutput = document.getElementById('login-output');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(loginForm);
    const email = formData.get('email');
    const password = formData.get('password');
    const pinCode = formData.get('pin');

    if (!email || !password || !pinCode) {
      loginOutput.textContent = 'Please fill all fields.';
      return;
    }

    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, pinCode })
      });

      const contentType = res.headers.get('content-type');

      if (!res.ok) {
        const text = await res.text();
        loginOutput.textContent = `Error ${res.status}: ${text}`;
        return;
      }

      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        loginOutput.textContent = 'Login successful. Redirecting...';
        setTimeout(() => {
          window.location.href = '/admin/users.html';
        }, 1000);
      } else {
        const text = await res.text();
        loginOutput.textContent = text;
      }
    } catch (err) {
      loginOutput.textContent = `Error: ${err.message}`;
    }
  });
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('password').value;

  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });

  if (response.ok) {
    localStorage.setItem('isAdmin', 'true');
    window.location.href = 'admin.html';
  } else {
    alert('Senha incorreta!');
  }
});

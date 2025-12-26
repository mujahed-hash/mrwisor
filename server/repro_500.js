async function test() {
    try {
        const email = `test${Date.now()}@example.com`;
        // 1. Register
        console.log('Registering...', email);
        const regRes = await fetch('http://localhost:5001/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test User',
                email: email,
                password: 'password123'
            })
        });

        let token;
        if (regRes.ok) {
            const data = await regRes.json();
            token = data.token;
        } else {
            console.log('Registration failed, trying login with default...');
            // Fallback or just fail
        }

        if (!token) {
            // Try login just in case
            const loginRes = await fetch('http://localhost:5001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'user1@example.com', // Try a likely seed user
                    password: 'password123'
                })
            });
            if (loginRes.ok) {
                const d = await loginRes.json();
                token = d.token;
            }
        }

        if (!token) throw new Error('Could not get token');
        console.log('Got token:', token ? 'Yes' : 'No');

        // 2. Fetch Expenses
        console.log('Fetching expenses...');
        const expenseRes = await fetch('http://localhost:5001/api/expenses', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!expenseRes.ok) {
            console.error('Fetch failed:', expenseRes.status, expenseRes.statusText);
            const text = await expenseRes.text();
            console.error('Body:', text);
        } else {
            const data = await expenseRes.json();
            console.log('Expenses:', data.length);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

test();

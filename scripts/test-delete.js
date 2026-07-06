// Native fetch in Node 21+
// const fetch = require('node-fetch');
// but let's assume valid environment.

async function testDelete() {
    const id = 1;
    const username = 'awfaw12345678';

    console.log(`Deleting ID ${id} with user ${username}...`);

    try {
        const res = await fetch(`http://localhost:3000/api/events/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });

        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Response:', data);
    } catch (e) {
        console.error('Error:', e);
    }
}

testDelete();

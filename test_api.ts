export {};
try {
    const res = await fetch('http://localhost:3000/api/branches');
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text);
} catch (e: any) {
    console.log('Error:', e.message);
} finally {
    process.exit();
}

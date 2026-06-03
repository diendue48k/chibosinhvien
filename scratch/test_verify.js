
async function test() {
  try {
    console.log('Sending request to verify SMTP configuration...');
    const res = await fetch('http://localhost:5000/api/verify');
    const data = await res.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error during fetch:', error);
  }
}

test();

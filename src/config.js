export const API_BASE_URL = 
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : ''; // Để trống để gọi API cùng domain trên Vercel (nếu chạy riêng backend Vercel, hãy điền URL Vercel của backend tại đây)

const http = require('http');

const request = (path, method, body, headers = {}) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

async function run() {
  console.log("1. Login as Admin");
  const adminLogin = await request('/api/auth/login', 'POST', { username: 'admin', password: 'admin123' });
  console.log(adminLogin);
  const adminId = adminLogin.data.user.id;

  console.log("\n2. Create teacher xuanminh");
  const teacherRes = await request('/api/users/teacher', 'POST', { username: 'xuanminh', password: 'password123' }, { 'x-user-id': adminId });
  console.log(teacherRes);
  const teacherId = teacherRes.data.user.id;

  console.log("\n3. Login as teacher");
  const teacherLogin = await request('/api/auth/login', 'POST', { username: 'xuanminh', password: 'password123' });
  console.log(teacherLogin);

  console.log("\n4. Create student quangtruong");
  const studentRes = await request('/api/users/student', 'POST', { username: 'quangtruong', password: 'password123' }, { 'x-user-id': adminId });
  console.log(studentRes);
}

run().catch(console.error);

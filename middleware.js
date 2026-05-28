import { NextResponse } from 'next/server';

export function middleware(req) {
  const basicAuth = req.headers.get('authorization');

  // Lấy mật khẩu từ Vercel điền ở Bước 1, nếu chưa có thì mặc định là 'admin123'
  const SECRET_KEY = process.env.WEBSITE_PASSWORD || 'admin123'; 
  const USERNAME = 'admin'; // Tên đăng nhập mặc định

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    try {
      const [user, pwd] = atob(authValue).split(':');
      if (user === USERNAME && pwd === SECRET_KEY) {
        return NextResponse.next();
      }
    } catch (e) {
      // Bỏ qua lỗi giải mã nếu có
    }
  }

  return new NextResponse('Vui lòng nhập mã khóa để truy cập.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};

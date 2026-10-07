# FoodSpin Web

React web app chính thức của FoodSpin, dùng chung API trong thư mục `BE`.

## Chạy local

```bash
copy .env.example .env
npm install
npm run dev
```

Mặc định web gọi API tại `http://localhost:3000`. Có thể đổi bằng `VITE_API_URL` trong `.env`.

## Kiểm tra

```bash
npm run typecheck
npm run build
```
# FoodSpin Web

Web mặc định chạy ở chế độ local-first (`VITE_STORAGE_MODE=local`), không cần API hoặc PostgreSQL. Dữ liệu tài khoản, món tự thêm, tùy chọn và lịch sử được lưu trong localStorage của trình duyệt.

```powershell
npm install
npm run dev
```

Muốn dùng backend thay vì localStorage:

```env
VITE_STORAGE_MODE=api
VITE_API_URL=http://localhost:3000
```

Deploy Vercel: chọn Root Directory là `web`, Framework là `Vite`, Build Command là `npm run build`, Output Directory là `dist`, và đặt `VITE_STORAGE_MODE=local`. File `vercel.json` đã cấu hình rewrite cho React Router.

LocalStorage phù hợp demo hoặc ứng dụng một trình duyệt; không dùng cách này cho mật khẩu/dữ liệu production hoặc nhiều người dùng đồng bộ.

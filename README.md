# FoodSpin

FoodSpin hiện sử dụng React web làm frontend duy nhất, kết nối với API Express trong `BE`.

## Cấu trúc

- `web`: React + TypeScript + Vite
- `BE`: Express + Prisma API

Chi tiết database, migration an toàn và seed dữ liệu nằm trong `BE/database`.

## Chạy frontend

```powershell
cd web
Copy-Item .env.example .env
npm install
npm run dev
```

Web mặc định kết nối API tại `http://localhost:3000`. Thay đổi `VITE_API_URL` trong `web/.env` nếu backend chạy tại địa chỉ khác.

## Build frontend

```powershell
cd web
npm run typecheck
npm run build
```
# FoodSpin Web

## Chạy toàn bộ project bằng Docker

Yêu cầu Docker Desktop đang chạy:

```powershell
docker compose up --build
```

Mở web tại `http://localhost:5173`. API chạy tại `http://localhost:3000`.

## Chạy web không cần database

Web mặc định chạy local-first: 38 món mẫu, tài khoản, món tự thêm, yêu thích, bật/tắt vòng quay và lịch sử được lưu trong `localStorage` của trình duyệt. Chỉ cần chạy:

```powershell
docker compose -f docker-compose.local.yml up --build
```

Hoặc chạy trực tiếp trong thư mục `web`:

```powershell
npm install
npm run dev
```

Chế độ local phù hợp demo và một trình duyệt. Mật khẩu cũng nằm trong localStorage nên không dùng cho production hoặc dữ liệu nhạy cảm. Khi cần nhiều người dùng và đồng bộ server, đặt `VITE_STORAGE_MODE=api` và dùng `docker-compose.yml` đầy đủ.

Database PostgreSQL được khởi tạo tự động bằng schema và seed trong `BE/database/` ở lần chạy đầu tiên. Dữ liệu được lưu trong volume `foodspin_pgdata`.

Để dừng:

```powershell
docker compose down
```

Chỉ xóa dữ liệu local khi thực sự cần:

```powershell
docker compose down -v
```

Các JWT secret trong compose chỉ dùng cho local development; production phải thay bằng secret ngẫu nhiên và cấu hình Cloudinary thật qua file `.env` hoặc secret manager.

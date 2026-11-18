# Cấu hình triển khai G-Scores

Bản tham chiếu cấu hình môi trường demo: React/Vite trên Vercel, NestJS trong Docker trên EC2 và PostgreSQL trên RDS. Các tài nguyên AWS nằm tại **ap-southeast-1 (Singapore)**.

**Demo:** [https://g-scores-eight.vercel.app/](https://g-scores-eight.vercel.app/)

![Kiến trúc triển khai G-Scores: Vercel, EC2 và RDS](diagrams/g-scores-cloud-deployment.png)

## Tổng quan

| Thành phần | Cấu hình |
|---|---|
| Frontend | Vercel, project `qbaels-projects/g-scores` |
| API public | `https://56.10.159.40/api` |
| Backend | Một EC2 `t4g.micro`, Docker và Nginx trên host |
| Database | Một RDS `db.t4g.micro`, PostgreSQL 18.6, Single-AZ, private |
| Luồng request | Trình duyệt → Vercel → Nginx trên EC2 → NestJS → RDS |
| Phân phối nội dung | Vercel quản lý; không có CDN AWS riêng |
| Mạng bổ sung | Không có NAT Gateway hoặc Load Balancer |

## Frontend — Vercel

| Thuộc tính | Giá trị |
|---|---|
| Framework | React + Vite |
| Domain production | `g-scores-eight.vercel.app` |
| Thư mục source | `apps/web` |
| Root Directory của project | `.`, tính từ source upload tại `apps/web` |
| Node.js | `24.x` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Git integration | Chưa kết nối |
| TLS frontend | Vercel quản lý |
| File bị loại khỏi upload | `.env*`, theo [`.vercelignore`](../apps/web/.vercelignore) |

Cấu hình routing trong [`apps/web/vercel.json`](../apps/web/vercel.json):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "npm ci",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://56.10.159.40/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "buildCommand": "npm run build"
}
```

Frontend gọi URL tương đối `/api/...`. Rewrite API đứng trước SPA fallback, giữ nguyên prefix `/api` và query string. Các route `/`, `/scores`, `/reports`, `/rankings` dùng fallback `/index.html`.

Frontend production không cần biến môi trường kết nối API hoặc database. `API_PROXY_TARGET` chỉ áp dụng cho Vite dev server; `WEB_PORT` chỉ áp dụng cho Docker local.

## Backend — EC2 và Docker

| Thuộc tính | Giá trị |
|---|---|
| EC2 instance | `i-055f77c1975d9fef5` |
| Instance type | `t4g.micro`, ARM64 |
| Hệ điều hành | Ubuntu Server 24.04 LTS |
| CPU credits | `standard` |
| EBS | gp3, 8 GiB |
| Swap | 1 GiB |
| Elastic IP | `56.10.159.40` |
| Dockerfile | [`apps/api/Dockerfile`](../apps/api/Dockerfile), target `runtime` |
| Docker image | `g-scores-api:c72e76d853d6-arm64` |
| Container | `g-scores-api` |
| Runtime | Node.js 24, user `node`, working directory `/app` |
| Lệnh khởi động container | `node dist/main.js`; migration tách khỏi tiến trình API |
| Restart policy | `unless-stopped` |
| Port trong container | `3000`, NestJS listen tại `0.0.0.0` |
| Port publish trên host | `127.0.0.1:3000:3000` |
| API prefix | `/api` |
| Docker log rotation | `max-size=10m`, `max-file=3` |

### Biến môi trường

File backend: `/opt/g-scores/api.env`, quyền `0600`.

```dotenv
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://g_scores:<URL_ENCODED_PASSWORD>@g-scores-db.c7qgaem64gqm.ap-southeast-1.rds.amazonaws.com:5432/g_scores?schema=public&sslmode=verify-full&sslrootcert=/certs/ap-southeast-1-bundle.pem
```

`<URL_ENCODED_PASSWORD>` là mật khẩu của database user `g_scores`, đã percent-encode. Giá trị trong Docker env file không có `export` hoặc dấu nháy bao quanh. `DATABASE_URL` được ưu tiên hơn các biến `POSTGRES_*`.

Mật khẩu và SSH private key nằm ngoài repository. Thông tin kết nối database chỉ thuộc backend, không nằm trong cấu hình Vercel hoặc biến `VITE_*`.

### Volume mount

| Đường dẫn trên EC2 | Đường dẫn trong container | Quyền |
|---|---|---|
| `/opt/g-scores/data` | `/data` | Read-only |
| `/opt/g-scores/certs` | `/certs` | Read-only |

## Database — RDS PostgreSQL

| Thuộc tính | Giá trị |
|---|---|
| DB identifier | `g-scores-db` |
| Engine | PostgreSQL 18.6 |
| Instance class | `db.t4g.micro` |
| Availability | Single-AZ |
| Storage | gp2, 5 GiB |
| Endpoint | `g-scores-db.c7qgaem64gqm.ap-southeast-1.rds.amazonaws.com` |
| Port | `5432` |
| Database / schema | `g_scores` / `public` |
| User ứng dụng | `g_scores`, không dùng master user cho runtime |
| Public access | No |
| DB subnet group | `g-scores-demo`, hai private subnet ở hai AZ trong cùng VPC |
| Parameter group | `g-scores-postgres18`, `rds.force_ssl=1` |

### TLS kết nối database

| Thành phần | Cấu hình |
|---|---|
| CA bundle trên EC2 | `/opt/g-scores/certs/ap-southeast-1-bundle.pem` |
| CA bundle trong container | `/certs/ap-southeast-1-bundle.pem` |
| API runtime, driver `pg` | `sslmode=verify-full`, `sslrootcert=/certs/ap-southeast-1-bundle.pem` |
| Prisma Migrate | `sslmode=require`, `sslcert=/certs/ap-southeast-1-bundle.pem`, `sslaccept=strict` |
| Biến môi trường riêng cho migration | `SSL_CERT_FILE=/certs/ap-southeast-1-bundle.pem` |

Runtime xác thực CA và hostname RDS. URL dành cho migration tách biệt với `DATABASE_URL` của API.

## Mạng và security group

| Tài nguyên | Cấu hình |
|---|---|
| VPC | `vpc-0278140498c4823f1` |
| Public subnet EC2 | `subnet-08f0bf3459ecc0f4d`, route Internet qua Internet Gateway |
| Private DB subnet A | `subnet-02fee44e5c4a514c3` |
| Private DB subnet B | `subnet-0b713e8ee95b5559b` |
| Security group EC2 | `sg-0a8d08681a7562b5a` |
| Security group RDS | `sg-0d1693ec404a4f243` |

| Đích | Inbound | Nguồn |
|---|---|---|
| EC2 | TCP 22 / SSH | IP quản trị, dạng `/32` |
| EC2 | TCP 80 / HTTP | `0.0.0.0/0` |
| EC2 | TCP 443 / HTTPS | `0.0.0.0/0` |
| RDS | TCP 5432 / PostgreSQL | Security group EC2 `sg-0a8d08681a7562b5a` |

Port `3000` chỉ được publish trên loopback của EC2. RDS không nhận kết nối từ Internet. API HTTPS là endpoint đọc dữ liệu công khai, không có đăng nhập; rewrite Vercel không giới hạn truy cập trực tiếp đến API.

## Nginx và HTTPS của API

| Thuộc tính | Cấu hình |
|---|---|
| API origin | `https://56.10.159.40`, không dùng domain riêng |
| Reverse proxy | `/api/` → `http://127.0.0.1:3000`, giữ nguyên prefix `/api` |
| HTTP port 80 | `/.well-known/acme-challenge/` phục vụ ACME; các đường dẫn còn lại redirect HTTPS |
| HTTPS port 443 | Nginx kết thúc TLS và chuyển request API đến NestJS |
| Chứng chỉ | Let's Encrypt, chứng chỉ IP, profile `shortlived` |
| Certificate directory | `/etc/letsencrypt/live/g-scores-api/` |
| ACME client | Certbot, webroot |
| Timer gia hạn | `snap.certbot.renew.timer` |
| Deploy hook chứng chỉ | `/etc/letsencrypt/renewal-hooks/deploy/g-scores-nginx`, kiểm tra và reload Nginx |

## Dữ liệu ứng dụng

| Thuộc tính | Cấu hình |
|---|---|
| Năm thi | `2024` |
| Dataset | `diem_thi_thpt_2024.csv` |
| CSV trong container | `/data/diem_thi_thpt_2024.csv` |
| Bảng dữ liệu | `exam_results` |
| Seed | Lifecycle NestJS, chỉ import khi bảng chưa có bản ghi |
| Transaction import | Atomic, advisory lock, timeout 10 phút |
| Thời điểm API listen | Sau khi import hoàn tất hoặc được bỏ qua |

CSV nằm ngoài frontend bundle. Khi bảng đã có dữ liệu, seed không thay thế dữ liệu hiện có. Mô hình một EC2 và RDS Single-AZ không có standby tự động.

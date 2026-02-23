# Bulk Order Processing Dashboard

## About the Platform
The **Bulk Order Processing Dashboard** is an enterprise-grade full-stack solution tailored for handling massive volumes of e-commerce data. It provides administrators with a seamless, intuitive interface to securely upload large Excel files containing thousands of order records. By leveraging a robust, asynchronous background worker architecture, the platform effortlessly crunches complex calculations—such as processing total revenue, aggregating items, and determining Average Order Value (AOV)—without ever blocking or slowing down the primary web interface. Users benefit from fluid real-time WebSocket updates that instantly reflect processing progress on modern dashboards, followed by comprehensive email reports delivered straight to their inboxes the moment a batch completes.

## Features
- **User Authentication**: Secure JWT-based login and registration.
- **Excel Uploads**: Robust file handling using `multer`.
- **Background Processing**: Asynchronous worker processes the Excel files and computes metrics (Revenue, Total Items, Average Order Value) without blocking HTTP requests.
- **Real-time Notifications**: WebSockets (Socket.io) to push real-time updates to the active client as jobs succeed or fail.
- **Email Notifications**: Nodemailer-based email dispatch upon task completion.
- **Dashboard UI**: Track upload history in real-time.

## Architecture & Technology Stack
- **Frontend**: Next.js 15, React 19, Redux Toolkit, Tailwind CSS, Socket.io-client, React Hot Toast
- **Backend**: Node.js, Express, TypeScript, MongoDB, Mongoose, Socket.io, Nodemailer, xlsx, multer
- **Background Jobs**: A background worker polls the database for 'pending' jobs. On picking a job via an atomic `findOneAndUpdate`, it locks it to 'processing', handles the workload, saves the output metrics, then dispatches real-time Socket events and email via Nodemailer. This provides guaranteed idempotency as jobs cannot jump from 'completed' back to 'processing'.
  
## Trade-offs Made
- Overusing full Redis/BullMQ queueing stack would over-complicate deployment. Used MongoDB-based polling worker which ensures simple operations while still achieving concurrency lock idempotency.
- Kept the UI in a clean minimal layout rather than spending hours on elaborate animations, focusing on architectural soundness and functional requirements.

## Assumptions
- Uses standard Excel document formatting correctly conforming to `productName`, `quantity`, `price` headers for the sheet parsing logic to accurately assess totals.
- The `SMTP` configured supports Nodemailer access.

## Environment Variables Configuration

Create a `.env` in the `server` folder format:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/bulk-orders
JWT_SECRET=super_secret_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
FRONTEND_URL=http://localhost:3000
```

## Setup Instructions

### 1. Database Setup
Start a MongoDB instance or get a cluster URI, and set `MONGO_URI` in your `.env`.

### 2. Backend Initialization
```bash
cd server
npm install
npm run dev
```

### 3. Frontend Initialization
```bash
cd client
npm install
npm run dev
```

Visit `http://localhost:3000` to register, log in, and begin uploading files.

### 4. Seed User
To run the seeder script that inserts the required `lusaibnetstager@gmail.com` profile:
```bash
cd server
npx ts-node src/seeder.ts
```

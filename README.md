# House Keeper 🏠

A modern, full-stack room management and rental application built with React, Vite, and Firebase. This application allows property owners to manage rooms, track rentals, and view statistics through an intuitive dashboard.

## ✨ Features

- **📊 Dashboard**: View real-time statistics and summaries of your property management.
- **🛏️ Room Management**: Full CRUD functionality for rooms, integrated with Firebase Firestore.
- **📅 Rent Room**: Manage room bookings, specify start/end times, and calculate deposits.
- **🔐 Secure Authentication**: Google Authentication powered by Firebase.
- **📱 Responsive Design**: Built with a "mobile-first" approach using modern CSS and Tailwind utilities.
- **📈 Data Visualization**: Interactive charts and data representation using Recharts.
- **✅ Form Validation**: Robust validation using React Hook Form and Yup.

## 🚀 Tech Stack

- **Frontend**: React 18, Vite
- **Styling**: Modern CSS, Lucide React (Icons)
- **Database & Auth**: Firebase (Firestore, Auth)
- **Routing**: React Router DOM v7
- **Forms**: React Hook Form, Yup
- **Charts**: Recharts

## 🛠️ Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm or yarn
- A Firebase project

### Installation

1. **Clone the repository**:
   ```bash
   git clone git@github.com:thongdn34/house-keeper-ht.git
   cd house-keeper
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env` file in the root directory and add your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

## 📂 Project Structure

- `src/firebase/`: Firebase configuration and initialization.
- `src/pages/`: Main application pages (Dashboard, Room Management, Rent Room, Login).
- `src/components/`: Reusable UI components.
- `src/App.jsx`: Main application logic and routing.

## 📄 License

This project is licensed under the MIT License.

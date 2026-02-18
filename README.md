# <div align="center">🛒 React + Django E-Commerce Platform</div>

<div align="center">BY <a href="https://github.com/Suryaprasath11"> SURYA PRASATH 🍸</a></div><br>

A full-stack e-commerce web application built with Django REST Framework and React (Vite).
This project focuses on scalable architecture, clean API design, and a modern frontend experience — now enhanced with **Email + OTP based authentication & order verification**.

<div align="center">
<img src="https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
<img src="https://img.shields.io/badge/Build-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
<img src="https://img.shields.io/badge/Backend-Django-092E20?style=for-the-badge&logo=django&logoColor=white" />
<img src="https://img.shields.io/badge/API-DRF-red?style=for-the-badge" />
<img src="https://img.shields.io/badge/Database-SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
</div>

---

```
React-Django-Ecommerce/
├── backend/
│   ├── api/
│   ├── settings.py
│   ├── urls.py
│   └── manage.py
│
├── madstore-frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

---

## ✨ Key Features

✅ Product listing & cart system
✅ REST API powered backend
✅ React + Vite frontend
✅ Order placement flow
✅ Email integration (SMTP)
✅ OTP verification for orders / authentication
✅ Secure environment variables

---

## 🎯 Project Goal

To demonstrate how a modern frontend can seamlessly interact with a robust Django backend, following best practices in API-driven development — including **real-world email + OTP flows**.

---

## 🚀 Tech Stack & Tools

* Frontend: React.js, Vite
* Backend: Django, Django REST Framework
* Database: SQLite / MySQL
* Styling: CSS / Bootstrap
* Email: SMTP (Gmail supported)
* Version Control: Git & GitHub

---

# 🚀 Getting Started (Local Setup)

## Clone Repository

```
git clone https://github.com/Suryaprasath11/React-Django-Ecommerce.git
cd React-Django-Ecommerce
```

---

## 🐍 Backend Setup (Django)

Create virtual environment:

```
python -m venv venv
```

Activate:

Windows

```
.\venv\Scripts\activate
```

Linux / macOS

```
source venv/bin/activate
```

Install dependencies:

```
pip install -r backend/requirements.txt
```

Apply migrations:

```
cd backend
python manage.py migrate
```

Run server:

```
python manage.py runserver
```

Backend runs on: [http://localhost:8000/](http://localhost:8000/)

---

## ⚛️ Frontend Setup

```
cd ../madstore-frontend
npm install
npm run dev
```

Frontend runs on: [http://localhost:5173/](http://localhost:5173/)

---

## 🔐 Email + OTP Configuration

Create `.env` inside **backend/**:

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
SECRET_KEY=your_django_secret
DEBUG=True
```

📌 OTP Flow:

* OTP sent to user email
* OTP validated before order confirmation
* Prevents fake orders

---

## 📌 Sample API Endpoints

/api/products/  → GET all products
/api/cart/ → POST cart
/api/send-otp/ → Send OTP
/api/verify-otp/ → Verify OTP
/api/place-order/ → Final order

---

## 🔄 Deployment

Frontend:

```
npm run build
```

Deploy on Netlify / Vercel

Backend:
Deploy Django on Render / Railway / DigitalOcean

---

## 📄 License

MIT License

---

## 🙌 Contributions

Feel free to improve this project — payments, user accounts, dashboards, etc.
PRs are welcome 🚀

---

Built with ❤️ by Surya

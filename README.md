# <div align="center">🛒 React + Django E-Commerce Platform</div>
<div align="center">BY <a href="https://github.com/Suryaprasath11"> SURYA PRASATH 🍸</a></div><br>
A full-stack e-commerce web application built with Django REST Framework and React (Vite).
This project focuses on scalable architecture, clean API design, and a modern frontend experience, making it a solid foundation for real-world online stores.
<br>
<div align="center"> <img src="https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black" /> <img src="https://img.shields.io/badge/Build-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" /> <img src="https://img.shields.io/badge/Backend-Django-092E20?style=for-the-badge&logo=django&logoColor=white" /> <img src="https://img.shields.io/badge/API-DRF-red?style=for-the-badge" /> <img src="https://img.shields.io/badge/Database-SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" /></div>

---


```
React-Django-Ecommerce/
├── backend/              # Django backend
│   ├── api/              # API app with models, serializers
│   ├── settings.py
│   ├── urls.py
│   └── manage.py
│
├── madstore-frontend/     # React frontend (Vite)
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md

```

## 🎯 Project Goal
  To demonstrate how a modern frontend can seamlessly interact with a robust Django backend, following best practices in API-driven development and clean code architecture.


## 🚀 Tech Stack & Tools

- **Frontend:** React.js, Vite
- **Backend:** Django, Django REST Framework
- **Database:** SQLite , MySQL
- **Styling:** CSS / Bootstrap
- **Version Control:** Git & GitHub


# 🚀 Getting Started (Local Setup)
--

## Clone the repository


```

git clone https://github.com/Suryaprasath11/React-Django-Ecommerce.git
cd React-Django-Ecommerce

```

## 🐍 Backend Setup (Django)

✧ Create virtual environment:
```

python -m venv venv

```

✧Activate environment:

Windows
```

.\venv\Scripts\activate

```
✧ Linux & macOS
```

source venv/bin/activate

```

✧ Install dependencies:
```

pip install -r backend/requirements.txt

```

✧ Apply migrations:
```

cd backend
python manage.py migrate

```

✧ Start backend server:
```

python manage.py runserver

```

The API should now be running at http://localhost:8000/.

## ⚛️ Frontend Setup (React + Vite)

Move to frontend folder:
```

cd ../madstore-frontend

```

✧ Install dependencies:
```

npm install

```

## Start development server:
```

npm run dev

```

The frontend should now be available at http://localhost:5173/ (or another port shown in terminal).

## ⚙ Environment Variables

✧ Create a .env file in both backend and frontend (if needed) to store keys:

# Example for backend
```

SECRET_KEY=your_django_secret_key

DEBUG=True

ALLOWED_HOSTS=localhost

```

Add any API URLs or auth tokens used by frontend here.

📌 API Endpoints (For Example)
Endpoint	Method<br>
⚙ /api/products/	-- GET all products<br>
⚙ /api/products/<id>/	-- GET single product<br>
⚙ /api/cart/	-- GET / POST cart items<br>
⚙ /api/cart/$id/	-- DELETE cart item<br>

(Add more based on your actual API)

## 🔄 Deployment

Before deploying:

✧ Run build for frontend:
```

npm run build

```

Serve build files with any static hosting (Netlify, Vercel, etc.)

Host Django app on Heroku/Render/DigitalOcean.

---

📄 License

This project is licensed under the MIT License.
Feel free to use, modify, and distribute as needed.

---

🙌 Contributions

Contributions are welcome!
If you find bugs or want to add features like payments, user profile, orders, etc., open an issue or PR.

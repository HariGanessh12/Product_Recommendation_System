# AI-Powered Product Recommendation System

ProductHub is a full-stack e-commerce recommendation platform that helps buyers discover relevant products, enables sellers to manage listings and analytics, and gives admins visibility into platform activity. It combines semantic recommendations, collaborative filtering, and behavior tracking to deliver a more personalized shopping experience.

## Features

- Role-based authentication for buyers, sellers, and admins
- Product catalog with search, category filters, price filtering, and sorting
- AI-powered personalized recommendations using S-BERT embeddings
- Collaborative filtering recommendations powered by implicit ALS
- Hybrid recommendation flow combining content, popularity, and user behavior
- Wishlist, cart, and review flows for richer personalization
- Seller-facing product management and performance insights
- Admin analytics for recommendation clicks, user behavior, and algorithm performance
- Trending and popular product sections backed by tracked engagement events
- Built-in AI shopping assistant interface for guided product discovery

## Tech Stack

- **React**: Builds the interactive frontend and role-based dashboard experience
- **Vite**: Provides fast frontend development and production builds
- **TypeScript + JavaScript**: Supports the frontend codebase, with Vite configured in TypeScript and UI modules primarily written in JSX
- **Tailwind CSS**: Handles utility-first styling for responsive UI components
- **Flask**: Powers the REST API for authentication, products, cart, wishlist, analytics, and recommendations
- **MongoDB / PyMongo**: Stores users, products, carts, wishlist data, and behavior events
- **JWT (Flask-JWT-Extended)**: Secures authenticated API access with token-based authorization
- **Sentence Transformers (S-BERT)**: Generates semantic product embeddings for content-based recommendations
- **scikit-learn**: Computes cosine similarity for semantic matching
- **implicit ALS**: Trains collaborative filtering models from cart and wishlist interactions
- **NumPy / SciPy / Pickle**: Supports matrix operations, model data handling, and cached recommendation artifacts

## Folder Structure

```text
Product_Recommendation_System_2/
|-- backend/
|   |-- app.py
|   |-- config.py
|   |-- requirements.txt
|   |-- seed_data.py
|   |-- init_recommendations.py
|   |-- middleware/
|   |-- models/
|   |-- routes/
|   `-- services/
|-- src/
|   |-- components/
|   |-- contexts/
|   |-- pages/
|   |-- App.jsx
|   `-- main.tsx
|-- package.json
|-- tailwind.config.js
`-- vite.config.ts
```

## Installation

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd Product_Recommendation_System_2
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Create and activate a Python virtual environment

```bash
cd backend
python -m venv venv
```

Windows:

```bash
venv\Scripts\activate
```

macOS/Linux:

```bash
source venv/bin/activate
```

### 4. Install backend dependencies

```bash
pip install -r requirements.txt
```

### 5. Install recommendation-engine dependencies

The recommendation services import additional ML libraries that may not yet be listed in `backend/requirements.txt`. Install them as well:

```bash
pip install sentence-transformers scikit-learn numpy scipy implicit
```

## Environment Variables

Create a `backend/.env` file and configure the following values:

```env
MONGODB_URI=mongodb://localhost:27017/producthub
JWT_SECRET_KEY=your-jwt-secret
SECRET_KEY=your-flask-secret
FLASK_DEBUG=True
PORT=5000
HOST=0.0.0.0
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000
FLASK_ENV=development
```

### Variable Notes

- `MONGODB_URI`: MongoDB connection string for local or Atlas database
- `JWT_SECRET_KEY`: Secret used to sign authentication tokens
- `SECRET_KEY`: Flask application secret key
- `FLASK_DEBUG`: Enables debug mode during development
- `PORT`: Backend server port
- `HOST`: Backend host binding
- `CORS_ORIGINS`: Allowed frontend origins for API access
- `FLASK_ENV`: Environment mode such as `development` or `production`

## Run Commands

### 1. Start the backend

From the `backend` folder:

```bash
python app.py
```

The Flask API should start on:

```text
http://127.0.0.1:5000
```

### 2. Start the frontend

Open a second terminal from the project root:

```bash
npm run dev
```

The Vite frontend should start on:

```text
http://localhost:5173
```

### 3. Optional setup utilities

Seed or prepare recommendation-related data if your local database needs initialization:

```bash
cd backend
python seed_data.py
python init_recommendations.py
```

## Deployment

Deploy the frontend and backend as separate services. The frontend build must know
the public URL of the backend API.

### Backend

Configure the deployment service with the values in
`backend/.env.example` as secret environment variables. In particular:

- Set `FLASK_ENV=production` and `FLASK_DEBUG=False`.
- Set `MONGODB_URI` and `MONGODB_DB_NAME` to the Atlas database that contains
  the application's collections.
- Use long, unique values for `JWT_SECRET_KEY` and `SECRET_KEY`.
- Set `CORS_ORIGINS` to the exact deployed frontend URL, for example
  `https://producthub.example.com`.

The repository includes a `Procfile` for platforms that support it. Its command
starts the Flask application with Gunicorn:

```bash
gunicorn --chdir backend --bind 0.0.0.0:$PORT "app:create_app()"
```

### Frontend

Before running the production build, create a frontend environment file from
`.env.production.example` and set the public backend API URL:

```env
VITE_API_BASE_URL=https://your-api-domain.example/api
```

Then build and deploy the generated `dist` directory:

```bash
npm run build
```

Do not commit either deployment environment file or any credentials.

## How It Works

1. Users register or log in as `buyer`, `seller`, or `admin`.
2. Buyers browse products, add items to cart or wishlist, and leave reviews.
3. Product interactions are tracked through analytics endpoints.
4. The recommendation engine uses:
   - S-BERT embeddings for semantic similarity
   - Collaborative filtering for user-item interaction patterns
   - Popularity and trending signals as fallback or hybrid inputs
5. Sellers manage product listings and monitor engagement.
6. Admins review system-level analytics and recommendation performance.

## Future Improvements

- Move frontend API URLs into Vite environment variables instead of hardcoded context constants
- Add Docker support for one-command local setup
- Expand test coverage for backend routes and recommendation services
- Add CI/CD workflows for linting, type checking, and deployment
- Improve the AI assistant by connecting it to a real LLM-powered backend
- Add richer seller analytics such as conversion funnels and inventory alerts

## Contribution Guidelines

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Make your changes with clear commit messages
4. Test your changes locally
5. Open a pull request with a short summary of what changed

For larger changes, open an issue first so the implementation direction can be discussed before development starts.

## License

This project is licensed under the MIT License. You can add a `LICENSE` file to the repository if you plan to distribute or open-source it formally.

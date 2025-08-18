# TutorCore Development Guide

This document provides a complete guide for setting up and running the **TutorCore platform** in a local development environment. It covers both the **backend API** (Express.js + Node.js) and the **frontend web application** (Angular), including database setup, environment configuration, and testing.

(version 1.0)

---

## Prerequisites

Before you begin, ensure the following are installed:

- [Node.js](https://nodejs.org/) (v22.x)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [MongoDB](https://www.mongodb.com/try/download/community) (local instance or cloud-hosted Atlas instance)
- [Angular CLI](https://angular.dev/cli) (`npm install -g @angular/cli`)
- [Git](https://git-scm.com/)

---

## Development Environment

The TutorCore platform is designed to be largely cross-platform, leveraging technologies like Node.js, npm, and MongoDB, which support multiple operating systems, but shall detail the Windows 11 Guide

- **Windows**: Windows 10 or later
- **macOS**: Recent versions (e.g., Ventura, Sonoma)
- **Linux**: Major distributions (e.g., Ubuntu, Fedora, Debian)

Ensure your specific OS version meets the minimum requirements for Node.js (v22.x) and MongoDB.

---

## 1. Cloning the Repositories

Clone both backend and frontend repositories:

**Backend API:**

```bash
git clone https://github.com/DylDavies/SDPApi.git
cd SDPApi
```

**Frontend Web Application**

```bash
git clone https://github.com/DylDavies/SDPWeb.git
cd SDPWeb
```

## 2. Branching Methodology

The project follows a git-flow-like branching strategy to manage development and releases:

### 2.1 Main Branch

This branch represents the production-ready code. All stable, deployed features are merged into `main`. Direct pushes to `main` are generally avoided; merges typically come from the `dev` branch after thorough testing.

### 2.2 Dev Branch

This is the primary integration branch for ongoing development. All new features and bug fixes are developed on separate feature branches and then merged into `dev`. The `dev` branch is periodically merged into `main` for releases.

### 2.3 Feature Branches

For any new feature or bug fix, create a new branch off of `dev` (e.g., `feature/your-feature-name` or `bugfix/issue-description`). Once the feature is complete and tested, merge it back into `dev` via a Pull Request.

## 3. Development Database Setup

Provides a safe environment for testing features without effecting the Production database and data.

1. Install MonogDB from https://www.mongodb.com/try/download/community and follow your OS download instruction guide.
2. Run the MongoDB server

```bash
mongod --dbpath "C:\data\db"
```

Remember to keep the terminal open, as closing will result in shutting down the running server.

3. Verify that installation is successful

```bash
mongod --version
```

4. Configure your application: Create a .env file in the root directory of your backend folder.

```.env
DB_CONN_STRING=mongodb://localhost:27017/tutor_management_dev
DB_NAME=tutorcore
```

5. (Optional) Seed the data. This populate the database with sample test data

```bash
npm run seed
```

## 4. Backend API Setup(Express and Node)

The backend provides endpoints for user profiles, scheduling and authentication

Steps:

1. Install dependencies:

```bash
npm ci
```

2. Setting up Google OAuth Credentials:

   To get your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, you need to create a project in the Google Cloud Console and configure an OAuth 2.0 Client ID.

   **Step-by-step Guide:**

   **2.1** Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).

   **2.2** Create a Project: If you don't have one already, create a new project (e.g., "TutorCore-Dev").

   **2.3** Create Credentials: At the top of the page, click "+ CREATE CREDENTIALS" and select "OAuth client ID".

   **2.4** Configure Consent Screen: If prompted, you'll need to configure the consent screen.

   - Choose **"External"** for the User Type.
   - Fill in the required fields (App name, User support email, Developer contact information). You can skip optional scopes and test users for now.

   **2.5** Create the OAuth Client ID:

   - For **"Application type"**, select **"Web application"**.
   - Give it a name, like "TutorCore Local Dev".
   - Under **"Authorized JavaScript origins"**, click "+ ADD URI" and enter your frontend's URL: `http://localhost:4200`
   - Under **"Authorized redirect URIs"**, click "+ ADD URI" and enter the callback URI your API uses. This must exactly match the `REDIRECT_URI` in your `.env` file: `http://localhost:8080/api/auth/callback`

   **2.6** Get Your Credentials: After clicking "CREATE", a popup will appear with your **Client ID** and **Client Secret**. Copy these values into your `.env` file.

3. Configure environment variables in .env:

```bash
# MongoDB Connection
DB_CONN_STRING=your_mongodb_connection_string_here
DB_NAME=tutorcore

# Google OAuth Credentials (from the steps above)
REDIRECT_URI=http://localhost:8080/api/auth/callback
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-from-google

# JWT Authentication
JWT_SECRET=generate_a_long_random_and_secure_string_for_this

# Frontend URL (for CORS and redirects)
FRONTEND_URL=http://localhost:4200
```

4. Run the development server

To start the server in development mode with automatic reloading on file changes, run:

```bash
# Ensure you have a "dev" script in your package.json (e.g., using ts-node-dev or nodemon)
npm run dev
```

This server will run on http://localhost:8080

5. Test API endpoints using tools like Postman

```h
GET http://localhost:8080/api/tutors
```

6. Running backend tests:

   To run the Jest test suite, use the following command:

```bash
npm test
```

To run tests and generate code coverage reports, use:

```bash
npm test -- --coverage
```

## 5. Frontend Web Application Setup(Angular)

The Angular frontend provides a dynamic interface for tutors and students.

Steps:

1. Install dependencies:

```bash
npm ci
```

2. Configure Environment variables:

- **For local development**, ensure `src/environments/environment.ts` points to your local API server:
  ```typescript
  export const environment = {
    production: false,
    apiUrl: "http://localhost:8080/api",
  };
  ```
- **For production builds**, `src/environments/environment.prod.ts` is used automatically and should point to the live API URL.

  This project uses dedicated files to manage the API URL for different environments.

3. Run the development server:
   To start the local development server, run the following command. The application will be available at `http://localhost:4200/`.

```bash
ng server
```

4. Run front end tests:
   To run the Karma/Jasmine test suite for all components and services, use the following command:

```bash
ng test
```

This will run in an interactive "watch mode" locally. The CI workflow is configured to run in a headless, single-run mode for automation.

# TutorCore Technology Stack

## Our Tech Stack (MEAN)

This project is built on the MEAN stack, a powerful and popular choice for building modern web applications.

- **M - MongoDB**: Our backend API uses MongoDB as its NoSQL database. It stores all application data, including user profiles, roles, and other essential information.
- **E - Express.js**: The backend is a robust API built with Express.js, running on Node.js. It handles all business logic, user authentication via Google OAuth2, and serves data to our Angular application.
- **A - Angular**: This repository contains the frontend, a dynamic Single-Page Application (SPA) built with a modern version of Angular. We leverage the latest features including Standalone Components, function-based Guards for route protection, and HTTP Interceptors to manage API communication.
- **N - Node.js**: Node.js serves as the runtime environment for our Express API and provides the tooling for the Angular development and build process.

## 1. MongoDB(Database Layer)

Our backend makes use of MongoDB as the database of choice, a NoSQL document database allowing for more flexibility, performance and scalability.

- Flexibility & JSON structure: MongoBS's BSON document model aligns naturally with JSON making it easy to manipulate and handle data. This is especially useful in projects like TutorCore, where different entities (e.g., tutors, students, sessions) may evolve over time.
- Scalability & Cloud Compatibility: Mongo has horizontal scaling ,sharding and cloud deployment through Mongo Atlas.

MongoDB is widely used in enterprise by Netflix, Uber, LinkedIn. This shows how flexible, reliable and trustworthy Mongo is. Mongo is also cloud ready making it easy to scale and deploy

> _“MongoDB is great for projects that need rapid development and scale quickly. Its flexible schema lets teams evolve their application without the heavy lifting of altering rigid relational schemas.”_ — [Infomaze](https://www.infomazeelite.com/why-choose-mongodb-over-sql-database/)

> _“MongoDB has been adopted by leading enterprises because of its ability to handle unstructured data, scalability, and ease of use with modern JavaScript frameworks.”_ — [Spinx Solutions](https://www.spinxdigital.com/blog/why-use-mongodb-for-your-next-project/)

> _“MongoDB’s document model maps to the objects in your application code, making data easy to work with. Its popularity in the MEAN stack is proof of how well it fits with Node.js and Angular applications.”_ — [Medium](https://medium.com/@amitrahav/why-mongodb-is-so-popular-in-modern-development-ecosystem-9a1dbd4ad02e)

## 2. Express.js(Backend Framework)

Our backend is a robust API built with **Express.js**, running on Node.js. It handles all business logic, manages API routes, integrates with Google OAuth2 for authentication, and connects with the MongoDB database.

- Express is lightweight and flexible making it ideal for rapidly building API that can scale. The middleware system allows for adding of features such as logging, authentication and validation.
- The express API is containerized and deployed with MongoDB, enabling modular scaling between the two.
- Reduces boilerplate code with build int HTTP methods and routing.

> _“Express.js has become the de facto standard server framework for Node.js, thanks to its simplicity, minimalism, and rich ecosystem of middleware.”_ — [RisingStack](https://blog.risingstack.com/why-to-use-express-js-node-js-framework/)

> _“Express is the most popular framework for Node.js, used by companies like Uber, IBM, and Accenture for building fast, scalable apps.”_ — [Toptal](https://www.toptal.com/express-js/nodejs-expressjs-rest-api-tutorial)

## 3. Angular(Frontend Framework)

The frontend is a **dynamic Single-Page Application (SPA)** built with **Angular**, a TypeScript-based framework maintained by Google.

- **UI Libraries**: We extensively use **Angular Material**, a UI component library developed by Google that provides responsive, accessible, and production-ready components following Material Design guidelines.
- **Why Angular**: Angular enforces structure and consistency through TypeScript, making the codebase maintainable for large teams. It offers built-in support for routing, reactive forms, dependency injection, and state management.

> _“Angular is a complete solution for building large-scale applications. Its opinionated structure, TypeScript integration, and built-in tooling make it a favorite for enterprise projects.”_ — [Medium](https://medium.com/@javayou/why-angular-is-still-relevant-in-2023-47d08a702d07)

> _“Angular Material provides developers with high-quality UI components that follow modern design principles, allowing for rapid prototyping and production-ready apps.”_ — [Angular Material Docs](https://material.angular.io/)

## 4. Node.js(Runtime Environment)

The project runs on **Node.js**, a high-performance JavaScript runtime built on Chrome’s V8 engine.

- **Why Node.js**: Node’s event-driven, non-blocking I/O model makes it perfect for real-time applications and APIs with high concurrency, like TutorCore’s tutoring session management.
- **Deployment**: Node.js applications are easily containerized with Docker and can be deployed on cloud services such as AWS, GCP, or Azure.
- **Usefulness**: Node.js allows our team to use **JavaScript/TypeScript across the full stack**, reducing context switching and enabling faster development.

> _“Node.js is designed to build scalable network applications. Its single-threaded event loop and non-blocking I/O make it lightweight and efficient.”_ — [Node.js Foundation](https://nodejs.org/en/about)

> _“Node.js is the dominant backend JavaScript runtime, powering apps for LinkedIn, Netflix, PayPal, and more due to its scalability and speed.”_ — [Infoworld](https://www.infoworld.com/article/3222855/what-is-nodejs-javascript-runtime-explained.html)

## 5. Libraries & External Packages

### Angular Material

- **Purpose**: provides a set of ready to use , accessible and responsive UI components.
- **Usage**: Used in frontend for consistent design elements such as navigation bars and buttons.
- **Why?**: Speed up development and consistent UI design

## References

- Infomaze. _Why choose MEAN stack for web app development?_ [Infomaze](https://www.infomazeelite.com/why-choose-mean-stack-for-web-app-development/)
- Spinx Solutions. _Advantages of Angular for Web Development._ [Spinx Solutions](https://www.spinxdigital.com/blog/angular-advantages/)
- Medium. _Why Angular Material Should Be Your UI Library of Choice (2021)._ [Medium](https://medium.com/swlh/why-angular-material-should-be-your-ui-library-of-choice-2021-34b2ff13fb5)
- Medium. _Passport.js: The Definitive Guide for Node.js Authentication._ [Medium](https://medium.com/@nishanksingla/passport-js-the-definitive-guide-for-node-js-authentication-9f6df8ab8e9f)
- Auth0. _Introduction to JSON Web Tokens._ [Auth0](https://auth0.com/learn/json-web-tokens/)

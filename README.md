# TutorCore Development Guide

This document provides a complete guide for setting up and running the **TutorCore platform** in a local development environment. It covers both the **backend API** (Express.js + Node.js) and the **frontend web application** (Angular), including database setup, environment configuration, and testing.

(version 4.0.0)

### Link to documentation: 

https://docs.google.com/document/d/1BPZIDnR-s_He5p6xu5FMFo6GpAuEMMncOMYEbDsGPV8/edit?usp=sharing 
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
DB_NAME=SDPApi

# Google OAuth Credentials
REDIRECT_URI=http://localhost:8080/api/auth/callback
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# JWT Authentication
JWT_SECRET=generate_a_long_random_and_secure_string_for_this

# Application URLs
FRONTEND_URL=http://your-domain-name.com
EXTERNAL_API_BASE_URL=https://your-external-api-url.com/api/external

# Debugging
DEBUG=true

# Email (Zoho)
EMAIL_HOST=smtp.zoho.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=your-zoho-email-user@example.com
EMAIL_PASS=your-zoho-email-password
EMAIL_FROM=your-zoho-from-email@example.com

# DigitalOcean Spaces Credentials
DO_SPACES_ACCESS_KEY_ID=your_do_spaces_access_key
DO_SPACES_SECRET_ACCESS_KEY=your_do_spaces_secret_key
DO_SPACES_ENDPOINT=fra1.digitaloceanspaces.com
DO_SPACES_BUCKET_NAME=tutorcore
DO_SPACES_REGION=fra1

# ZeptoMail Token
ZEPTOMAIL_TOKEN=your_zeptomail_api_token

# Google Maps API Key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
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


## 6. Testing Strategy

A robust testing strategy is crucial for maintaining code quality, preventing regressions, and ensuring all parts of the application behave as expected. This section covers the testing approach for both our Angular frontend and our Express.js backend.

### 6.1 Frontend Testing (Angular)

Our frontend testing is built on the foundation of Angular's built-in testing tools, primarily **Jasmine** (as the testing framework) and **Karma** (as the test runner). We focus on **unit tests** to ensure that individual parts of our application work correctly in isolation.

#### What We Test and Why

The testing approach differs slightly depending on the type of file:

-   **Component Testing (`.spec.ts`):**
    -   **What:** We test the interaction between the component's class (TypeScript logic) and its template (HTML). This includes user interactions, data binding, and conditional rendering.
    -   **Why:** To verify that the UI behaves correctly from a user's perspective. When a user clicks a button, fills a form, or receives data, the component should respond as expected.
    -   **How:** We use Angular's `TestBed` to create an instance of the component in a controlled environment. We simulate user actions (like clicks) and then check if the component's state has changed correctly or if the right methods were called.

        ```typescript
        // Conceptual Example for a component test
        it('should call the submit method when the save button is clicked', () => {
          spyOn(component, 'submit'); // Create a spy on the component's submit method
          const saveButton = fixture.nativeElement.querySelector('button.save');
          saveButton.click(); // Simulate a user click
          expect(component.submit).toHaveBeenCalled(); // Verify the method was called
        });
        ```

-   **Service Testing (`.spec.ts`):**
    -   **What:** We test the public methods of a service to verify its business logic. This is where we test data transformations and interactions with other services (like `HttpService`).
    -   **Why:** To ensure the core business logic of our application is reliable, independent of any single component. This is crucial for data consistency across the app.
    -   **How:** We use `TestBed` to inject an instance of the service. We provide mock implementations for its dependencies (like `HttpService`) so we can test the service's logic without making real network calls. This makes our tests faster and more predictable.

        ```typescript
        // Conceptual Example for a service test
        it('should fetch users via a GET request', () => {
          const mockUsers = [{ id: 1, name: 'Test User' }];
          // Tell our HttpService spy to return a mock value when 'get' is called
          httpServiceSpy.get.and.returnValue(of(mockUsers));

          service.getUsers().subscribe(users => {
            expect(users.length).toBe(1);
            expect(users[0].name).toBe('Test User');
          });

          // Verify that the HttpService's 'get' method was called with the correct endpoint
          expect(httpServiceSpy.get).toHaveBeenCalledWith('users');
        });
        ```

-   **Pipe Testing (`.spec.ts`):**
    -   **What:** We test the `transform` method of our custom pipes.
    -   **Why:** To guarantee that data is consistently and correctly formatted for display in the UI. Since pipes are often used in many places, a single test can ensure correctness across the entire application.
    -   **How:** Pipes are simple classes, so we can often test them by creating a `new` instance directly without needing the full `TestBed`. We pass various inputs to the `transform` method and assert that the output is what we expect.

        ```typescript
        // Conceptual Example for a pipe test
        it('should correctly format a user type string', () => {
          const pipe = new UserTypePipe();
          expect(pipe.transform('admin')).toBe('Administrator');
          expect(pipe.transform('staff')).toBe('Staff');
        });
        ```

-   **Guard Testing (`.spec.ts`):**
    -   **What:** We test the logic within our route guards (`CanActivateFn`).
    -   **Why:** This is critical for application security. We need to verify that users are correctly allowed or blocked from accessing routes based on their authentication status and permissions.
    -   **How:** We use `TestBed` to provide mock services (like `AuthService` and `Router`). We then execute the guard function and control the return values of our mock services to simulate different scenarios (e.g., user is logged in, user is an admin, user is not logged in). We then check if the guard returns `true`, `false`, or a `UrlTree` for redirection.

        ```typescript
        // Conceptual Example for a guard test
        it('should deny access if the user does not have the required permission', () => {
          // Tell the AuthService mock that the user does NOT have permission
          authServiceSpy.hasPermission.and.returnValue(false);
          
          const canActivate = executeGuard([EPermission.ADMIN_DASHBOARD_VIEW]);
          
          expect(canActivate).toBeInstanceOf(UrlTree); // Expect a redirect
        });
        ```

#### How to Add a New Frontend Test

Our convention is to create a test file named `[filename].spec.ts` alongside the file it is testing (e.g., `auth.service.ts` and `auth.service.spec.ts`).

-   For **components, directives, and pipes**, the Angular CLI automatically generates this `.spec.ts` file for you when you run `ng generate component ...`.
-   For **services and guards**, you can create the `.spec.ts` file manually in the same directory.

---

### 6.2 Backend Testing (Jest & Supertest)

To ensure the reliability, security, and correctness of our API, we employ a thorough testing strategy using **Jest** as our primary testing framework and **Supertest** for testing HTTP endpoints.

#### Test File Structure

As a convention, all test files are located within the `__tests__` directory at the root of the backend project. The structure inside `__tests__` mirrors the main `src` directory, making it easy to locate the tests for a specific file.

-   Tests for a route file like `src/routes/user/users.routes.ts` will be located at `__tests__/routes/user/users.routes.test.ts`.
-   Tests for a service like `src/services/BundleService.ts` will be located at `__tests__/services/BundleService.test.ts`.

#### What We Test and Why

-   **Route/Endpoint Testing (`__tests__/routes`):**
    -   **What:** This is the highest level of testing we perform. We test the API endpoints themselves by making mock HTTP requests (e.g., `GET /api/users`, `POST /api/roles`).
    -   **Why:** To verify the API's public contract. These tests confirm that endpoints are correctly configured, protected by the right middleware, handle valid and invalid inputs, and return the correct HTTP status codes and JSON data shapes.
    -   **How:** We use `supertest` to send requests to our Express app. Dependencies, especially database and service layers, are mocked using Jest to ensure tests are fast and predictable.

-   **Service Testing (`__tests__/services`):**
    -   **What:** We test the business logic contained within our service files (e.g., `UserService`, `RoleService`).
    -   **Why:** Services contain the core application logic. By unit testing them in isolation, we can ensure complex operations (like calculating payslip data or building a role hierarchy) are correct without the overhead of HTTP requests.
    -   **How:** We import the service directly into our test file. All of its dependencies (like Mongoose models) are mocked using `jest.mock()`. We then call the service's methods with various inputs and assert that the outputs are correct and that the mocked dependencies were called as expected.

-   **Middleware Testing (`__tests__/middleware`):**
    -   **What:** We test individual middleware functions, such as those that handle authentication or permission checks.
    -   **Why:** Middleware is critical for security and ensuring requests are properly validated before they reach a route handler. Testing this layer in isolation helps prevent security vulnerabilities.
    -   **How:** We call the middleware function directly with mocked Express `req`, `res`, and `next` objects. We can then assert that `next()` is called for a valid request, or that an appropriate HTTP status (like `401 Unauthorized` or `403 Forbidden`) is sent for an invalid one.

#### How to Add a New Backend Test

1.  **Create the Test File:** Following the convention mentioned above, create a `[filename].test.ts` file in the corresponding `__tests__` subdirectory.
2.  **Structure the Test:** Use Jest's BDD (Behavior-Driven Development) syntax with `describe`, `it`, and `expect`.
    -   `describe('GroupName', () => { ... })`: Groups related tests together.
    -   `it('should do something', () => { ... })`: Defines an individual test case.
    -   `expect(value).matcher()`: Makes an assertion (e.g., `expect(response.status).toBe(200);`).
3.  **Mock Dependencies:** Use `jest.mock('../path/to/dependency')` at the top of your test file to mock any modules the file under test imports. This is crucial for isolating your tests.
4.  **Write the Test Logic:** Inside your `it` block, set up any required data, call the function or send the request you want to test, and then make assertions about the result.

---

### 6.3 Automated Testing and CI/CD

All tests for both the frontend and backend are designed to be fully automated. This is essential for our Continuous Integration (CI) pipeline (e.g., GitHub Actions), which runs on every push to the `dev` and `main` branches to act as a quality gate.

-   **Frontend Automation:**
    The CI workflow runs the tests in a headless, single-run mode.
    ```bash
    ng test --code-coverage --watch=false --browsers=ChromeHeadless
    ```

-   **Backend Automation:**
    The CI workflow runs the Jest test suite.
    ```bash
    npm test -- --coverage
    ```

### 6.4 Viewing Code Coverage Reports

To check how much of your code is covered by tests, you can generate coverage reports for both projects.

-   **Frontend Coverage:**
    Run `ng test --code-coverage`. This creates a `coverage/` directory. Open `coverage/sdpweb/index.html` in your browser to see the interactive report.

-   **Backend Coverage:**
    Run `npm test -- --coverage`. This creates a `coverage/` directory. Open `coverage/lcov-report/index.html` in your browser to see the interactive report.


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


# Project Vision & Goals

## Problem Statement
The management, scheduling, and payment processing for tutoring services is often fragmented, relying on manual spreadsheets and disparate communication channels. This leads to administrative overhead, scheduling conflicts, and a lack of transparency for both tutors and students.

## Solution
We are developing a centralized, all-in-one platform to streamline every aspect of tutor management. The system will automate scheduling via an interactive timetable, manage user roles and permissions, track performance with stats and badges, and handle complex tasks like payslip generation and student-tutor matching.

## Core Objectives
- To develop a secure, scalable, and intuitive platform for tutors, students, and administrators.
- To create a robust backend API that can support a wide range of features, from event management to AI-assisted debriefing.

---

# Scope and Feature Prioritization by Sprint

This plan outlines an iterative approach to development. Each sprint builds upon the last, delivering a progressively more functional product.

## Sprint 1: Foundation & Core User Experience (MVP)

**Theme:** The primary goal of this sprint is to establish the technical foundation and build the essential user-facing components. A user should be able to sign up, log in, and view a basic, non-interactive version of their personal space.

#### Features to Implement:
- **User Authentication & Onboarding:**
  - Feature: Secure sign-up and login using Google OAuth.
- **Core Application Shell:**
  - Feature: A static Landing Page for unauthenticated users.
  - Feature: A logged-in experience with a basic layout, including a TopBar and SideBar component.
- **Basic User Profile:**
  - Feature: A view-only Profile Page that displays the user's basic information retrieved from the database.
- **Dashboard & Timetable Placeholder:**
  - Feature: A Dashboard Page that acts as the main landing area after login.

#### API & Backend Development:
- **Users API:** Initial version with endpoints for Creation (via Google Auth), and Reading a user's own data.
- **Database Entities:** Schemas for Users.

#### UI/UX Pages:
- Landing Page
- 404 page
- Sign Up Page
- Logged in pages `/` (The main application shell)
- `Dashboard/`
- `Profile/`

---

## Sprint 2: Management Systems & Core Functionality

**Theme:** With the foundation laid, this sprint focuses on empowering Administrators and Tutors. We will build the core management systems for users, events, turning the static application into an interactive platform.

#### Features to Implement:
- **User & Access Management:**
  - Feature: A Team / User Management Page for Admins to archive, and manage users.
  - Feature: An Admin Page for managing system-wide Roles and Permissions.
- **Event & Timetable Management:**
  - Feature: The Time Table/Events Management Page is made and small interactions are present.
- **Tutor & Student Core Systems:**
  - Feature: Profile Page is enhanced to allow Tutors to manage their Proficiencies and Availability (AVA).
  - Feature: A Leave system allowing Tutors to report and manage their leave days.
  - Feature: A Bundle Management page for Admins to link students to tutors and manage lesson bundles.
- **External API Integration:**
  - Feature: Connecting to third-party systems like the "campus study buddy project" to link study sessions with events.

#### API & Backend Development:
- **Users API:** Expanded to include full CRUD operations for admins, Settings, and Location fields.
- **Roles/Permissions API:** Fully implemented with endpoints for assignment and customization.
- **Proficiencies API:** Endpoints for tutors to manage their subjects.
- **Subjects API:** Endpoints for admins to manage available subjects/syllabi.
- **Bundles API:** Endpoints for creating and managing student lesson bundles.
- **Leave API:** Endpoints for submitting and viewing leave.

#### UI/UX Pages:
- Team / User Management Page
- Time Table/Events Management Page (now interactive)
- Admin Page
- Bundle Management Page

---

## Sprint 3: Engagement, Communication & Reporting

**Theme:** This sprint is about enriching the user experience. We will add features that increase engagement (badges, missions), improve communication (notifications), and provide valuable feedback and reporting mechanisms (debriefs, stats).

#### Features to Implement:
- **User Engagement:**
  - Feature: A Badges system to reward tutors for achievements, complete with rate increases. Displayed on the Profile Page.
  - Feature: A Missions system for Admins to set goals for tutors regarding specific students. Viewable on the Students Page.
- **Reporting & Feedback:**
  - Feature: An Event Rating system allowing students to rate completed sessions.
  - Feature: A Debrief System where tutors can leave voice note reports for a student after an event. Managed on the Students Page.
  - Feature: An Extra Work Management system for tutors to report and claim compensation for work outside of scheduled events.
- **Communication:**
  - Feature: An email-based Notifications system for critical actions (e.g., event cancellation, report submission).
- **Data & Analytics:**
  - Feature: A Stats page for viewing key metrics (Num Hours, Subjects, etc.) for both tutors and admins.
- **Financial Systems:**
  - Feature: A Payslip System allowing for the creation and querying of payslips based on completed events. Includes a Payslips Management Page and a detailed Payslip Page.
- **Event & Timetable Management:**
  - Feature: The Time Table/Events Management Page is made with users being able to load and remark events.

#### API & Backend Development:
- **Badges API:** Endpoints for achievement management.
- **Debrief API:** Endpoints for uploading and linking voice notes to users/events.
- **Extra Work API:** Endpoints to manage claims.
- **Missions API:** Endpoints for goal management.
- **Events API:** Full CRUD functionality implemented.
- **Notifications Service:** Backend implementation for sending emails.

#### UI/UX Pages:
- Payslips Management Page & Payslip Page
- Students Page (for debriefs and missions)
- Extra Work Page

---

## Sprint 4: Intelligence, Polish & Advanced Features

**Theme:** The final sprint focuses on implementing advanced, "intelligent" features that provide a competitive edge. We will also incorporate visual polish and features that enhance organizational transparency.

#### Features to Implement:
- **Intelligent Matching & AI:**
  - Feature: Location & proficiency matching system to help admins find the best tutor for a student, potentially with a map-based view on the Bundle Management page.
  - Feature: AI Implementation to assist with Event Remarks, providing summaries or flagging keywords from tutor debriefs.
- **Organizational Features:**
  - Feature: An Organisational Chart component added to the Profile Page to show user hierarchies and relationships.
- **Data & Analytics:**
  - Feature: A Stats page for viewing key metrics (Num Hours, Subjects, etc.) for both tutors and admins.
- **Final Polish:**
  - Feature: Final UI/UX review and enhancements across the entire application.

#### API & Backend Development:
- **Stats API:** Endpoints for retrieving statistics.

#### UI/UX Pages:
- Stats Page

---

### Features Out of Scope for Initial Sprints (Future Development)
- **Payment System through portal:** A fully integrated payment gateway is a significant undertaking and is planned for a post-launch release.

---

# Database Schema Design

The following MongoDB collections will form the core of our database. Relationships will be managed via object IDs.

The database consists of the following 14 primary collections as of right now:

1.  [**Users**](#1-users-collection): Stores all user account information.
2.  [**Roles**](#2-roles-collection): Defines the role-based access control (RBAC) hierarchy.
3.  [**Proficiencies**](#3-proficiencies-collection): Contains the master list of all teaching syllabi and subjects.
4.  [**Bundles**](#4-bundles-collection): Manages student lesson bundles, linking students to tutors.
5.  [**ApiKeys**](#5-apikeys-collection): Stores hashed API keys for external system access.
6.  [**Badges**](#6-badges-collection): Stores information about badges that can be awarded to users.
7.  [**BadgeRequirements**](#7-badgerequirements-collection): Stores the requirements for earning each badge.
8.  [**Events**](#8-events-collection): Contains details of tutoring sessions, including ratings and remarks.
9.  [**ExtraWork**](#9-extrawork-collection): Manages requests for extra work and their approval status.
10. [**Missions**](#10-missions-collection): Manages missions assigned to users.
11. [**Notifications**](#11-notifications-collection): Stores notifications for users.
12. [**Remarks**](#12-remarks-collection): Stores remarks made on events.
13. [**RemarkTemplates**](#13-remarktemplates-collection): Stores templates for remarks.
14. [**SidebarItems**](#14-sidebaritems-collection): Defines the structure of the sidebar navigation.
15. [**Payslips**](#15-payslips-collection): Stores generated payslip data for tutors.
16. [**PreapprovedItems**](#16-preapproveditems-collection): Stores pre-approved items for payslips.

---

## 1. `users` Collection

Stores information about all registered users, including their personal details, authentication info, roles, status, and application-specific data like leave and proficiencies.

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Unique identifier for the user document. | Automatically generated. |
| `googleId` | `String` | The unique ID provided by Google OAuth. | **Required**, **Unique** |
| `email` | `String` | The user's email address. | **Required**, **Unique** |
| `displayName` | `String` | The user's public display name. | **Required** |
| `picture` | `String` | URL to the user's profile picture. | Optional |
| `firstLogin` | `Boolean` | Flag to determine if the user needs to complete the initial profile setup. | `Default: true` |
| `type` | `String` | The primary category of the user. | **Required**, Enum: `EUserType:[admin, staff, client]`, `Default: 'client'` |
| `roles` | `Array<ObjectId>` | An array of ObjectIds referencing documents in the `roles` collection. | `ref: 'Role'` |
| `leave` | `Array` | An array of embedded leave request documents. (See **Leave Sub-schema** below). | N/A |
| `pending` | `Boolean` | If `true`, the user's account is awaiting admin approval. | **Required**, `Default: true` |
| `disabled` | `Boolean` | If `true`, the user's account is disabled and they cannot log in. | **Required**, `Default: false` |
| `proficiencies`| `Array` | An array of embedded proficiency documents specific to the user. | See `proficiencies` collection. |
| `theme` | `String` | The user's preferred UI theme. | Enum: `['light', 'dark', 'system']`, `Default: 'system'` |
| `availability` | `Number` | A field to store a tutor's availability in hours. | `Default: 0` |
| `badges` | `Array` | An array of embedded badge documents. | See **User Badge Sub-schema** below. |
| `paymentType` | `String` | The user's payment type. | Enum: `['Contract', 'Salaried']`, `Default: 'Contract'` |
| `monthlyMinimum`| `Number` | The minimum monthly payment for the user. | `Default: 0` |
| `rateAdjustments`| `Array` | An array of embedded rate adjustment documents. | See **Rate Adjustment Sub-schema** below. |
| `createdAt` | `Date` | Timestamp of when the user was created. | `timestamps: true` |
| `updatedAt` | `Date` | Timestamp of the last update. | `timestamps: true` |

#### Leave Sub-schema (Embedded in `users`)

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `reason` | `String` | The reason provided for the leave request. | **Required** |
| `startDate` | `Date` | The starting date of the leave period. | **Required** |
| `endDate` | `Date` | The ending date of the leave period. | **Required** |
| `approved` | `String` | The current status of the leave request. | Enum: `ELeave: [pending, approved, denied]`, `Default: 'pending'` |

#### User Badge Sub-schema (Embedded in `users`)

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `badge` | `ObjectId` | A reference to the badge document. | **Required**, `ref: 'Badges'` |
| `dateAdded` | `Date` | The date the badge was added. | `Default: Date.now` |

#### Rate Adjustment Sub-schema (Embedded in `users`)

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `reason` | `String` | The reason for the rate adjustment. | **Required** |
| `newRate` | `Number` | The new rate for the user. | **Required** |
| `effectiveDate`| `Date` | The date the new rate is effective from. | **Required** |
| `approvingManagerId` | `ObjectId` | A reference to the approving manager's user document. | **Required**, `ref: 'User'` |

---

## 2. `roles` Collection

Defines a hierarchical structure of roles, each with a specific set of permissions that can be assigned to users. This collection powers the Role-Based Access Control (RBAC) system.

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Unique identifier for the role document. | Automatically generated. |
| `name` | `String` | The unique name of the role (e.g., "Senior Tutor", "Content Manager"). | **Required**, **Unique** |
| `permissions` | `Array<String>` | A list of permission strings granted by this role. | **Required**, Enum: `EPermission:[ROLES_CREATE,ROLES_VIEW,ROLES_EDIT,ROLES_DELETE,USERS_VIEW,USERS_MANAGE_ROLES,USERS_EDIT,USERS_DELETE,VIEW_USER_PROFILE,DASHBOARD_VIEW,ADMIN_DASHBOARD_VIEW,PROFILE_PAGE_VIEW,BUNDLES_CREATE,BUNDLES_VIEW,BUNDLES_EDIT,BUNDLES_DELETEPROFICIENCIES_MANAGE,LEAVE_MANAGE]` |
| `parent` | `ObjectId` | A self-reference to a parent role, creating a tree structure. | `ref: 'Role'`, `Default: null` (for root roles) |
| `color` | `String` | A hex color code for displaying the role in the UI. | **Required** |
| `createdAt` | `Date` | Timestamp of when the role was created. | `timestamps: true` |
| `updatedAt` | `Date` | Timestamp of the last update. | `timestamps: true` |

---

## 3. `proficiencies` Collection

Stores the master list of all available teaching syllabi (e.g., Cambridge, IEB) and the subjects/grades associated with each. This acts as a template from which tutors can select their own proficiencies (which are then embedded in their `user` document).

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Unique identifier for the proficiency document. | Automatically generated. |
| `name` | `String` | The name of the proficiency/syllabus (e.g., "Cambridge"). | **Required** |
| `subjects`| `Map` | A map where keys are subject identifiers and values are embedded subject documents. | **Required**, `of: SubjectSchema` |

#### Subject Sub-schema (Embedded in `proficiencies`)

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Unique identifier for the subject within the proficiency. | `_id: true` |
| `name` | `String` | The name of the subject (e.g., "Mathematics", "Physical Sciences"). | **Required** |
| `grades` | `Array<String>` | A list of grades available for this subject (e.g., ["Grade 10", "Grade 11"]). | **Required**, `Default: []` |

---

## 4. `bundles` Collection

Manages lesson bundles, linking a student to one or more tutors for specific subjects and a set number of hours.

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Unique identifier for the bundle document. | Automatically generated. |
| `student` | `ObjectId` | A reference to the student user document. | **Required**, `ref: 'User'` |
| `subjects` | `Array` | An array of embedded documents detailing the subjects in the bundle. | See **Bundle Subject Sub-schema** below. |
| `isActive` | `Boolean` | A flag to quickly activate or deactivate a bundle. | `Default: true` |
| `status` | `String` | The current status of the bundle (e.g., Pending, Active, Completed). | Enum: `EBundleStatus:[Approved, Pending, Denied]`, `Default: 'Pending'` |
| `createdBy` | `ObjectId` | A reference to the admin/user who created the bundle. | **Required**, `ref: 'User'` |
| `createdAt` | `Date` | Timestamp of when the bundle was created. | `timestamps: true` |
| `updatedAt` | `Date` | Timestamp of the last update. | `timestamps: true` |

#### Bundle Subject Sub-schema (Embedded in `bundles`)

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `subject` | `String` | The name of the subject for this part of the bundle. | **Required** |
| `grade` | `String` | The grade of the subject. | **Required** |
| `tutor` | `ObjectId` | A reference to the tutor user assigned to this subject. | **Required**, `ref: 'User'` |
| `durationMinutes` | `Number` | The number of lesson minutes allocated for this subject in the bundle. | **Required**, `min: 0` |

---

## 5. `apikeys` Collection

Stores API keys for external clients, allowing secure, programmatic access to the system. Keys are hashed for security and are never stored in plain text.

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Unique identifier for the API key document. | Automatically generated. |
| `clientName` | `String` | A unique, human-readable name for the client using the key. | **Required**, **Unique** |
| `key` | `String` | The **hashed** API key. | **Required** |
| `createdAt` | `Date` | Timestamp of when the key was created. | `timestamps: true` |
| `updatedAt` | `Date` | Timestamp of the last update. | `timestamps: true` |

---

## 6. `badges` Collection

Stores information about badges that can be awarded to users.

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Unique identifier for the badge document. | Automatically generated. |
| `name` | `String` | The unique name of the badge. | **Required**, **Unique** |
| `image` | `String` | The URL to the badge's image. | **Required** |
| `TLA` | `String` | A three-letter acronym for the badge. | **Required** |
| `summary` | `String` | A short summary of the badge. | **Required** |
| `description`| `String` | A detailed description of the badge. | **Required** |
| `permanent` | `Boolean` | A flag to determine if the badge is permanent. | **Required**, `Default: false` |
| `duration` | `Number` | The duration of the badge in days. | Optional |
| `bonus` | `Number` | A bonus value associated with the badge. | **Required**, `Default: 0` |
| `createdAt` | `Date` | Timestamp of when the badge was created. | `timestamps: true` |
| `updatedAt` | `Date` | Timestamp of the last update. | `timestamps: true` |

---

## 7. `badgerequirements` Collection

Stores the requirements for earning each badge.

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Unique identifier for the badge requirement document. | Automatically generated. |
| `badgeId` | `ObjectId` | A reference to the badge document. | **Required**, **Unique**, `ref: 'Badges'` |
| `requirements`| `String` | The requirements for the badge. | **Required**, `Default: 'No requirements specified for this badge yet.'` |
| `createdAt` | `Date` | Timestamp of when the badge requirement was created. | `timestamps: true` |
| `updatedAt` | `Date` | Timestamp of the last update. | `timestamps: true` |

---

## 8. `events` Collection

Contains details of tutoring sessions, including ratings and remarks.

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Unique identifier for the event document. | Automatically generated. |
| `bundle` | `ObjectId` | A reference to the bundle document. | **Required**, `ref: 'Bundle'` |
| `student` | `ObjectId` | A reference to the student user document. | **Required**, `ref: 'User'` |
| `tutor` | `ObjectId` | A reference to the tutor user document. | **Required**, `ref: 'User'` |
| `subject` | `String` | The subject of the event. | **Required** |
| `startTime` | `Date` | The start time of the event. | **Required** |
| `duration` | `Number` | The duration of the event in minutes. | **Required** |
| `remarked` | `Boolean` | A flag to determine if the event has been remarked. | `Default: false` |
| `remark` | `ObjectId` | A reference to the remark document. | `ref: 'Remark'` |
| `rating` | `Number` | The student's rating out of 5. | Optional |
| `createdAt` | `Date` | Timestamp of when the event was created. | `timestamps: true` |
| `updatedAt` | `Date` | Timestamp of the last update. | `timestamps: true` |

---

## 9. `extrawork` Collection

Manages requests for extra work and their approval status.

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Unique identifier for the extra work document. | Automatically generated. |
| `userId` | `ObjectId` | A reference to the user document. | **Required**, `ref: 'User'` |
| `studentId` | `ObjectId` | A reference to the student user document. | **Required**, `ref: 'User'` |
| `commissionerId` | `ObjectId` | A reference to the commissioner user document. | **Required**, `ref: 'User'` |
| `workType` | `String` | The type of work. | **Required** |
| `details` | `String` | The details of the work. | **Required**, `maxlength: 500` |
| `remuneration`| `Number` | The remuneration for the work. | **Required**, `min: 0`, `max: 10000` |
| `dateCompleted`| `Date` | The date the work was completed. | `Default: null` |
| `status` | `String` | The current status of the extra work. | Enum: `EExtraWorkStatus: [In Progress, Completed, Approved, Denied]`, `Default: 'In Progress'` |
| `createdAt` | `Date` | Timestamp of when the extra work was created. | `timestamps: true` |
| `updatedAt` | `Date` | Timestamp of the last update. | `timestamps: true` |

---

## 10. `missions` Collection

Manages missions assigned to users.

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Unique identifier for the mission document. | Automatically generated. |
| `bundleId` | `ObjectId` | A reference to the bundle document. | **Required**, `ref: 'Bundle'` |
| `documentPath` | `String` | The path to the mission document. | **Required** |
| `documentName` | `String` | The name of the mission document. | **Required** |
| `student` | `ObjectId` | A reference to the student user document. | **Required**, `ref: 'User'` |
| `tutor` | `ObjectId` | A reference to the tutor user document. | **Required**, `ref: 'User'` |
| `remuneration`| `Number` | The remuneration for the mission. | **Required**, `min: 0` |
| `commissionedBy`| `ObjectId` | A reference to the commissioning user document. | **Required**, `ref: 'User'` |
| `hoursCompleted`| `Number` | The number of hours completed for the mission. | `Default: 0` |
| `dateCompleted`| `Date` | The date the mission was completed. | **Required** |
| `status` | `String` | The current status of the mission. | Enum: `EMissionStatus: [active, inactive, completed, achieved, failed]`, `Default: 'active'` |
| `createdAt` | `Date` | Timestamp of when the mission was created. | `timestamps: true` |
| `updatedAt` | `Date` | Timestamp of the last update. | `timestamps: true` |

---

## 11. `notifications` Collection

Stores notifications for users.

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Unique identifier for the notification document. | Automatically generated. |
| `recipientId`| `ObjectId` | A reference to the recipient user document. | **Required**, `ref: 'User'` |
| `title` | `String` | The title of the notification. | **Required** |
| `message` | `String` | The message of the notification. | **Required** |
| `read` | `Boolean` | A flag to determine if the notification has been read. | `Default: false` |
| `deletedAt` | `Date` | The date the notification was deleted. | `Default: null` |
| `createdAt` | `Date` | Timestamp of when the notification was created. | `timestamps: true` |

---

## 12. `remarks` Collection

Stores remarks made on events.

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Unique identifier for the remark document. | Automatically generated. |
| `event` | `ObjectId` | A reference to the event document. | **Required**, `ref: 'Event'` |
| `template` | `ObjectId` | A reference to the remark template document. | **Required**, `ref: 'RemarkTemplate'` |
| `remarkedAt`| `Date` | The date the remark was made. | `Default: Date.now` |
| `entries` | `Array` | An array of embedded remark entry documents. | See **Remark Entry Sub-schema** below. |
| `createdAt` | `Date` | Timestamp of when the remark was created. | `timestamps: true` |
| `updatedAt` | `Date` | Timestamp of the last update. | `timestamps: true` |

#### Remark Entry Sub-schema (Embedded in `remarks`)

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `field` | `String` | The field of the remark entry. | **Required** |
| `value` | `Mixed` | The value of the remark entry. | **Required** |

---

## 13. `remarktemplates` Collection

Stores templates for remarks.

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Unique identifier for the remark template document. | Automatically generated. |
| `name` | `String` | The name of the remark template. | **Required** |
| `fields` | `Array` | An array of embedded remark field documents. | See **Remark Field Sub-schema** below. |
| `isActive` | `Boolean` | A flag to determine if the remark template is active. | `Default: true` |
| `createdAt` | `Date` | Timestamp of when the remark template was created. | `timestamps: true` |
| `updatedAt` | `Date` | Timestamp of the last update. | `timestamps: true` |

#### Remark Field Sub-schema (Embedded in `remarktemplates`)

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `name` | `String` | The name of the remark field. | **Required** |
| `type` | `String` | The type of the remark field. | **Required**, Enum: `['string', 'boolean', 'number', 'time']` |

---

## 14. `sidebaritems` Collection

Defines the structure of the sidebar navigation.

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Unique identifier for the sidebar item document. | Automatically generated. |
| `label` | `String` | The label of the sidebar item. | **Required** |
| `icon` | `String` | The icon of the sidebar item. | **Required** |
| `route` | `String` | The route of the sidebar item. | Optional |
| `requiredPermissions`| `Array<String>` | An array of permission strings required to view the sidebar item. | `Default: []` |
| `order` | `Number` | The order of the sidebar item. | **Required**, `Default: 0` |
| `children` | `Array` | An array of embedded sidebar item documents. | Optional |
#### Special Logic & Methods


## 15. `payslips` Collection

Stores generated payslip data, including detailed breakdowns of earnings, bonuses, deductions, and historical changes.

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Unique identifier for the payslip document. | Automatically generated. |
| `userId` | `String` | Reference to the user this payslip belongs to. | **Required** |
| `payPeriod` | `String` | The pay period in 'YYYY-MM' format. | **Required** |
| `status` | `String` | The current status of the payslip. | Enum: `EPayslipStatus`, `Default: 'Draft'` |
| `earnings` | `Array` | An array of embedded documents for earnings from lessons. | See **Earning Sub-schema**. |
| `miscEarnings`| `Array` | An array of embedded documents for miscellaneous earnings. | See **Misc Earning Sub-schema**. |
| `bonuses`| `Array` | An array of embedded documents for bonuses. | See **Bonus Sub-schema**. |
| `deductions`| `Array` | An array of embedded documents for deductions. | See **Deduction Sub-schema**. |
| `grossEarnings`| `Number` | The total earnings before any deductions. | **Required** |
| `totalDeductions`| `Number` | The sum of all deductions. | **Required** |
| `netPay` | `Number` | The final take-home pay after all deductions. | **Required** |
| `uif` | `Number` | Unemployment Insurance Fund contribution. | **Required** |
| `paye` | `Number` | Pay As You Earn tax contribution. | **Required** |
| `notes` | `Array` | An array of embedded query notes related to the payslip. | See **Note Sub-schema**. |
| `history` | `Array` | An array of embedded history logs tracking status changes. | See **History Sub-schema**. |

---

#### Earning Sub-schema (Embedded in `payslips`)

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `description` | `String` | Description of the teaching session. | N/A |
| `baseRate` | `Number` | The base rate for the session. | N/A |
| `hours` | `Number` | The number of hours taught. | N/A |
| `rate` | `Number` | The hourly rate applied. | N/A |
| `total` | `Number` | The total amount for this earning entry. | N/A |
| `date` | `String` | The date of the session. | N/A |

---

#### Misc Earning Sub-schema (Embedded in `payslips`)

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `description` | `String` | Description of the miscellaneous earning. | N/A |
| `amount` | `Number` | The amount of the earning. | N/A |

---

#### Bonus Sub-schema (Embedded in `payslips`)

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `description` | `String` | Description of the bonus. | N/A |
| `amount` | `Number` | The amount of the bonus. | N/A |

---

#### Deduction Sub-schema (Embedded in `payslips`)

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `description` | `String` | Description of the deduction. | N/A |
| `amount` | `Number` | The amount of the deduction. | N/A |

---

#### Note Sub-schema (Embedded in `payslips`)

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `_id` | `String` | Unique identifier for the note. | Optional |
| `itemId` | `String` | The ID of the item being queried. | **Required** |
| `note` | `String` | The content of the query note. | **Required** |
| `resolved` | `Boolean` | Whether the query has been resolved. | **Required** |

---

#### History Sub-schema (Embedded in `payslips`)

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `status` | `String` | The status that was set. | **Required** |
| `timestamp` | `Date` | The timestamp of the status change. | **Required** |
| `updatedBy` | `String` | The ID of the user who made the change. | **Required** |

---

## 16. `preapproveditems` Collection

Stores a list of pre-approved bonus or deduction items that can be quickly added to a payslip.

| Field | Data Type | Description | Constraints & Defaults |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Unique identifier for the pre-approved item. | Automatically generated. |
| `itemName` | `String` | The name of the item (e.g., "Performance Bonus"). | **Required** |
| `itemType` | `String` | The type of item. | Enum: `EItemType ['Earning', 'Deduction']` |
| `defaultAmount`| `Number` | The default monetary value of the item. | **Required** |
| `isAdminOnly`| `Boolean` | If true, only an admin can add this item to a payslip. | **Required** |

---

# Development Roadmap

| Sprint    | Duration  | Theme & Key Goals                                                                         |
| :-------- | :-------- | :---------------------------------------------------------------------------------------- |
| Sprint 1  | 2 Weeks   | **Foundation & Authentication:** User Login (Google), Dashboard & Profile Pages, Core UI. |
| Sprint 2  | 2 Weeks   | **User Management:** Admin User Management (Roles), Bundle.                               |
| Sprint 3  | 3.5 Weeks | **Core Functionality:** Interactive Timetable (CRUD), Notifications, Missions, Payslips.  |
| Sprint 4  | 3 Weeks   | **Advanced Features & Intelligence:** AI Assist, Proficiency Matching, Stats Dashboard.   |

---

# System Architecture & Technical Design

We are implementing a 3-Tier Architecture to ensure a clean separation of concerns between the user interface, business logic, and data storage.

**Tech Stack:**
- **Frontend:** Angular
- **Backend:** Node.js with Express.js
- **Database:** MongoDB

### Architecture Design:

**Presentation Tier (Frontend - `Website/`)**
- Developed using Angular, this client-side application is responsible for all user interaction and rendering.
- It is component-based, with reusable elements like `Modal` and `ProfileCard`.
- Data is fetched and managed through injectable Services (`AuthService`, `UserService`), which consume the backend API via a central HTTP service.

**Application Tier (Backend - `API/`)**
- A Node.js/Express RESTful API that handles all business logic.
- Its structure is service-oriented, with Services (`UserService`) encapsulating logic and consuming the MongoDB service for database operations.
- Middleware is used for handling authentication (`Auth`) and attaching user data to requests (`User attach`).

**Data Tier (Database)**
- A MongoDB NoSQL database is used for flexible and scalable data storage.
- Data structures are defined by Models (`User`, `Event`, `Remark`). Direct database interaction is abstracted away by the `API/Services/MongoDB` service.
